export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { system, userMessage, mode, password } = req.body;
  if (!system || !userMessage) {
    res.status(400).json({ error: 'Missing required fields' }); return;
  }

  // Verify premium password
  const isPremium = password && password === process.env.PREMIUM_PASSWORD;

  // Rate limiting for free users only
  if (!isPremium) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    if (!global._rl) global._rl = {};
    const now = Date.now();
    const windowMs = 24 * 60 * 60 * 1000;
    if (!global._rl[ip]) global._rl[ip] = { count: 0, start: now };
    if (now - global._rl[ip].start > windowMs) global._rl[ip] = { count: 0, start: now };
    if (global._rl[ip].count >= 3) {
      res.status(429).json({ error: 'FREE_LIMIT_REACHED' }); return;
    }
    global._rl[ip].count++;
  }

  // Password validation endpoint
  if (mode === 'validate_password') {
    res.status(200).json({ valid: isPremium }); return;
  }

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
    res.status(200).json({ text, isPremium });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
