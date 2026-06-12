import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { system, userMessage, mode, password } = req.body;
  if (!system || !userMessage) { res.status(400).json({ error: 'Missing fields' }); return; }

  // ── VALIDATE PASSWORD ────────────────────────────────────────────────────
  const monthlyPw = process.env.PREMIUM_PASSWORD_MONTHLY;
  const lifetimePw = process.env.PREMIUM_PASSWORD_LIFETIME;
  const isPremium = password && (password === monthlyPw || password === lifetimePw);
  const tier = password === lifetimePw ? 'lifetime' : password === monthlyPw ? 'monthly' : 'free';

  if (mode === 'validate_password') {
    res.status(200).json({ valid: isPremium, tier }); return;
  }

  // ── INPUT VALIDATION — prevent abuse via huge prompts ───────────────────
  if (typeof system !== 'string' || typeof userMessage !== 'string') {
    res.status(400).json({ error: 'Invalid input' }); return;
  }
  if (userMessage.length > 500) {
    res.status(400).json({ error: 'Input too long. Keep it under 500 characters.' }); return;
  }
  if (system.length > 3000) {
    res.status(400).json({ error: 'Invalid request' }); return;
  }

  try {
    // ── GLOBAL MONTHLY COST CAP ─────────────────────────────────────────────
    // Hard ceiling: 10,000 free requests per month = ~$30 max Anthropic cost
    // Adjust MONTHLY_FREE_CAP env var to change the limit
    const monthlyCap = parseInt(process.env.MONTHLY_FREE_CAP || '10000');
    const monthKey = `global:free:${new Date().toISOString().slice(0, 7)}`; // global:free:2025-06

    if (!isPremium) {
      const globalCount = await kv.get(monthKey) || 0;
      if (globalCount >= monthlyCap) {
        res.status(429).json({ error: 'GLOBAL_LIMIT_REACHED' }); return;
      }
    }

    // ── PER-USER DAILY RATE LIMIT ───────────────────────────────────────────
    if (!isPremium) {
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
        || req.socket?.remoteAddress
        || 'unknown';

      const today = new Date().toISOString().slice(0, 10);
      const key = `rl:${ip}:${today}`;

      const count = await kv.incr(key);
      if (count === 1) await kv.expire(key, 86400);

      if (count > 3) {
        res.status(429).json({ error: 'FREE_LIMIT_REACHED', count }); return;
      }

      // Increment global monthly counter after passing rate limit check
      await kv.incr(monthKey);
      // Set expiry on first request of the month (31 days)
      if ((await kv.get(monthKey)) === 1) await kv.expire(monthKey, 31 * 86400);
    }

  } catch (kvErr) {
    // KV failure — fail open for user experience but log it
    console.error('KV error:', kvErr.message);
  }

  // ── CALL ANTHROPIC ──────────────────────────────────────────────────────
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: isPremium ? 2500 : 900,
        system,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    const data = await response.json();
    if (data.error) { res.status(500).json({ error: data.error.message }); return; }
    const text = data.content.map(b => b.text || '').join('');
    res.status(200).json({ text, tier });
  } catch (err) {
    console.error('Anthropic API error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
