import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    // Vercel provides raw body via req.body when bodyParser is disabled
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    res.status(400).json({ error: 'Webhook signature verification failed' });
    return;
  }

  const type = event.type;
  const obj = event.data.object;

  // Get customer email from the event
  async function getEmail(obj) {
    if (obj.customer_email) return obj.customer_email;
    if (obj.customer) {
      const customer = await stripe.customers.retrieve(obj.customer);
      return customer.email;
    }
    return null;
  }

  // Send password email via Resend (free email API)
  async function sendPasswordEmail(email, tier) {
    const password = tier === 'lifetime'
      ? process.env.PREMIUM_PASSWORD_LIFETIME
      : process.env.PREMIUM_PASSWORD_MONTHLY;

    const subject = tier === 'lifetime'
      ? '⚡ Your QuickFuel Kitchen Lifetime Access'
      : '⚡ Your QuickFuel Kitchen Premium Password';

    const planText = tier === 'lifetime'
      ? 'You now have lifetime access — this password never expires.'
      : 'Your password is active while your subscription is running.';

    const html = `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:2rem">
        <div style="background:#4A5C2E;padding:1.5rem;border-radius:12px;text-align:center;margin-bottom:1.5rem">
          <h1 style="color:white;font-size:1.5rem;margin:0">QuickFuel Kitchen</h1>
          <p style="color:rgba(255,255,255,.7);margin:.5rem 0 0;font-size:.9rem">by @spatulaspiceandtales</p>
        </div>
        <h2 style="color:#2C3A1A">You're in! 🎉</h2>
        <p style="color:#6B7560;line-height:1.6">
          Thank you for getting Premium. ${planText}
        </p>
        <div style="background:#EEF2E8;border:2px solid #D6DFCA;border-radius:12px;padding:1.5rem;text-align:center;margin:1.5rem 0">
          <p style="font-size:.8rem;color:#6B7560;text-transform:uppercase;letter-spacing:.1em;margin:0 0 .5rem">Your Premium Password</p>
          <div style="font-size:1.8rem;font-weight:700;color:#2C3A1A;letter-spacing:.15em">${password}</div>
          <p style="font-size:.75rem;color:#6B7560;margin:.75rem 0 0">Keep this safe — don't share it</p>
        </div>
        <div style="background:#4A5C2E;border-radius:10px;padding:1.25rem;text-align:center;margin-bottom:1.5rem">
          <a href="${process.env.TOOL_URL}" style="color:white;text-decoration:none;font-weight:600;font-size:1rem">
            ⚡ Go to QuickFuel Kitchen →
          </a>
        </div>
        <p style="color:#6B7560;font-size:.85rem;line-height:1.6">
          <strong>How to use it:</strong> Visit the tool, click "I have a password", enter the password above, and everything unlocks instantly on your device.
        </p>
        <hr style="border:none;border-top:1px solid #D4DBCA;margin:1.5rem 0">
        <p style="color:#6B7560;font-size:.8rem">
          Questions? Reply to this email or DM <a href="https://instagram.com/spatulaspiceandtales" style="color:#4A5C2E">@spatulaspiceandtales</a> on Instagram.
        </p>
      </div>
    `;

    // Using Resend API (free tier: 100 emails/day)
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'QuickFuel Kitchen <onboarding@resend.dev>',
        to: email,
        subject,
        html
      })
    });
  }

  try {
    // NEW SUBSCRIPTION — monthly
    if (type === 'customer.subscription.created') {
      const email = await getEmail(obj);
      if (email) await sendPasswordEmail(email, 'monthly');
    }

    // ONE-TIME LIFETIME PURCHASE
    if (type === 'checkout.session.completed') {
      const mode = obj.mode;
      if (mode === 'payment') {
        // One-time payment = lifetime
        const email = obj.customer_email || await getEmail(obj);
        if (email) await sendPasswordEmail(email, 'lifetime');
      }
    }

    // SUBSCRIPTION RENEWED — resend monthly password as reminder
    if (type === 'invoice.payment_succeeded') {
      const sub = obj.subscription;
      if (sub) {
        // Only send on first invoice, not renewals
        const invoice = obj;
        if (invoice.billing_reason === 'subscription_create') {
          // Already handled by subscription.created — skip
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: err.message });
  }
}

// Helper to get raw body for Stripe signature verification
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(Buffer.from(data)));
    req.on('error', reject);
  });
}

export const config = {
  api: { bodyParser: false }
};
