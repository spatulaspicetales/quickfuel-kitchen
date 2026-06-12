import Stripe from 'stripe';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { plan } = req.body; // 'monthly' or 'lifetime'
  const toolUrl = process.env.TOOL_URL || 'https://yourapp.vercel.app';

  try {
    let session;

    if (plan === 'monthly') {
      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{
          price: process.env.STRIPE_MONTHLY_PRICE_ID,
          quantity: 1
        }],
        success_url: `${toolUrl}?success=monthly`,
        cancel_url: `${toolUrl}?cancelled=true`,
        allow_promotion_codes: true,
        subscription_data: {
          metadata: { plan: 'monthly' }
        }
      });
    } else if (plan === 'lifetime') {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price: process.env.STRIPE_LIFETIME_PRICE_ID,
          quantity: 1
        }],
        success_url: `${toolUrl}?success=lifetime`,
        cancel_url: `${toolUrl}?cancelled=true`,
      });
    } else {
      res.status(400).json({ error: 'Invalid plan' }); return;
    }

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: err.message });
  }
}
