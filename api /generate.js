export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { system, userMessage, mode, password } = req.body;
  if (!system || !userMessage) { res.status(400).json({ error: 'Missing fields' }); return; }

  const monthlyPw = process.env.PREMIUM_PASSWORD_MONTHLY;
  const lifetimePw = process.env.PREMIUM_PASSWORD_LIFETIME;
  const isPremium = password && (password === monthlyPw || password === lifetimePw);
  const tier = password === lifetimePw ? 'lifetime' : password === monthlyPw ? 'monthly' : 'free';

  if (mode === 'validate_password') {
    res.status(200).json({ valid: isPremium, tier }); return;
  }

  if (typeof system !== 'string' || typeof userMessage !== 'string') {
    res.status(400).json({ error: 'Invalid input' }); return;
  }
  if (userMessage.length > 500) {
    res.status(400).json({ error: 'Input too long. Keep it under 500 characters.' }); return;
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
    res.status(200).json({ text, tier });
  } catch (err) {
    console.error('Anthropic API error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
