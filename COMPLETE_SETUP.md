# QuickFuel Kitchen — Complete Setup Guide

## Your file structure on GitHub
```
quickfuel-kitchen/
├── api/
│   ├── generate.js          ← AI backend + rate limiting
│   ├── create-checkout.js   ← Stripe payment sessions
│   └── stripe-webhook.js    ← Auto email password after payment
├── index.html               ← Full tool frontend
├── package.json             ← Node dependencies
├── vercel.json              ← Deployment config
└── README.md
```

---

## PART 1 — Vercel Setup (already done)
✅ Vercel account created
✅ GitHub repo connected
✅ Basic deployment working

---

## PART 2 — Vercel KV (persistent rate limiting)

### Step 1 — Create KV database
1. vercel.com → **Storage** tab (top nav)
2. Click **Create Database** → choose **KV**
3. Name: `quickfuel-ratelimit`
4. Region: US East → **Create**

### Step 2 — Connect to your project
1. Inside the KV database → click **Connect Project**
2. Select `quickfuel-kitchen` → **All Environments** → **Connect**
3. Vercel auto-adds all KV environment variables — nothing to copy

### Step 3 — Redeploy
Vercel → your project → Deployments → 3 dots → **Redeploy**

---

## PART 3 — Stripe Setup

### Step 1 — Create Stripe account
1. Go to **stripe.com** → Sign Up free
2. Complete business profile — use your personal name as sole trader
3. Settings → Payouts → add your bank account
4. **Stay in Test Mode** (toggle top-left) until everything is tested

### Step 2 — Create Monthly product
1. Stripe dashboard → **Product catalog** → **Add product**
2. Name: `QuickFuel Kitchen Premium — Monthly`
3. Description: `Unlimited AI recipes, full macros, grocery lists, meal plans, Creator Kit`
4. Pricing model: **Recurring**
5. Price: `$5.99` → Currency: USD → Billing: Monthly
6. Click **Save product**
7. Copy the **Price ID** → looks like `price_1ABC123...` → save it

### Step 3 — Create Lifetime product
1. **Add product** again
2. Name: `QuickFuel Kitchen Premium — Lifetime`
3. Pricing model: **One time**
4. Price: `$29.00`
5. Click **Save product**
6. Copy the **Price ID** → save it

### Step 4 — Get your Stripe API keys
1. Stripe → **Developers** (top right) → **API keys**
2. Copy **Secret key** → starts with `sk_test_...` (test mode)
3. Save it — you'll add it to Vercel next

### Step 5 — Set up Stripe webhook
1. Stripe → **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://YOUR-VERCEL-URL.vercel.app/api/stripe-webhook`
   (replace with your actual Vercel URL)
3. Click **Select events** → add these two:
   - `customer.subscription.created`
   - `checkout.session.completed`
4. Click **Add endpoint**
5. Copy the **Signing secret** → starts with `whsec_...`

---

## PART 4 — Resend Setup (automated password emails)

### Step 1 — Create account
1. Go to **resend.com** → Sign Up free
2. Free tier: 100 emails/day, 3,000/month — plenty to start

### Step 2 — Get API key
1. Resend → **API Keys** → **Create API Key**
2. Name: `quickfuel`
3. Copy the key → starts with `re_...`

### Step 3 — Set your sender email
Option A (free, works immediately):
- Use `onboarding@resend.dev` as the from address
- Update `stripe-webhook.js` line: `from: 'QuickFuel Kitchen <onboarding@resend.dev>'`

Option B (professional, takes 10 min):
- Resend → **Domains** → **Add Domain**
- Add your domain (e.g. spatulaspiceandtales.com)
- Add the DNS records they show you (copy-paste into your domain registrar)
- Then use `noreply@spatulaspiceandtales.com` as sender

---

## PART 5 — All Environment Variables in Vercel

Go to: Vercel → your project → **Settings** → **Environment Variables**

Add every single one of these:

| Variable name | Value | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | console.anthropic.com → API Keys |
| `PREMIUM_PASSWORD_MONTHLY` | `SPATULA599` | You choose — give to monthly buyers |
| `PREMIUM_PASSWORD_LIFETIME` | `SPATULA29LIFE` | You choose — give to lifetime buyers |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Stripe → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe → Developers → Webhooks |
| `STRIPE_MONTHLY_PRICE_ID` | `price_1ABC...` | Your monthly product Price ID |
| `STRIPE_LIFETIME_PRICE_ID` | `price_1XYZ...` | Your lifetime product Price ID |
| `RESEND_API_KEY` | `re_...` | resend.com → API Keys |
| `TOOL_URL` | `https://your-app.vercel.app` | Your Vercel deployment URL |
| `MONTHLY_FREE_CAP` | `10000` | Hard cap — ~$30 max Anthropic cost |

After adding all variables:
Vercel → Deployments → 3 dots on latest → **Redeploy**

---

## PART 6 — API Cost Cap ($30/month hard limit)

Your `MONTHLY_FREE_CAP` environment variable controls this.

### How it works
- Every free API call increments a global counter in Vercel KV
- Key format: `global:free:2025-06` (resets each month automatically)
- Once counter hits `MONTHLY_FREE_CAP`, free users see:
  "The free tier is at capacity today — please try again tomorrow or upgrade to Premium"
- Premium users are NEVER affected by this cap

### Cost math
| MONTHLY_FREE_CAP | Max Anthropic cost | Use when |
|---|---|---|
| `5000` | ~$15/month | Conservative, just launching |
| `10000` | ~$30/month | Default — recommended |
| `20000` | ~$60/month | High traffic, good conversion |

### How to change it anytime
Vercel → Settings → Environment Variables → find `MONTHLY_FREE_CAP` → edit value → Save → Redeploy

Start at `5000` while testing. Move to `10000` once you have paying subscribers.

---

## PART 7 — Test Everything Before Going Live

### Test Stripe payments (test mode)
Use this fake card — no real money charged:
- Card: `4242 4242 4242 4242`
- Expiry: any future date (e.g. `12/29`)
- CVC: any 3 digits (e.g. `123`)
- ZIP: any 5 digits (e.g. `12345`)

**Test flow:**
1. Visit your tool
2. Click "Get Monthly" 
3. Stripe checkout opens → use test card → complete payment
4. You should be redirected back to tool with password gate open
5. Check the email address you used → password email should arrive within 60 seconds
6. Enter password → Premium should unlock

**Test the lifetime flow same way** using "Get Lifetime"

### Test rate limiting
1. Open your tool in a normal browser
2. Generate 3 recipes — should work fine
3. Try a 4th — should show limit card
4. Open an incognito window — new IP simulation, should get 3 more
5. Check Vercel KV dashboard → Storage → your database → you should see `rl:` keys

### Test the $30 cap
1. In Vercel → Environment Variables → temporarily set `MONTHLY_FREE_CAP` to `2`
2. Generate 3 free recipes from different browsers
3. 3rd should show "free tier at capacity" message
4. Change back to `10000` and redeploy

---

## PART 8 — Go Live on Stripe

When all tests pass:

1. Stripe → toggle from **Test** to **Live** mode (top-left switch)
2. Go to **Product catalog** → recreate both products in Live mode
   (same names and prices — Live mode has separate products from Test mode)
3. Copy new Live **Price IDs** for both products
4. Stripe → **Developers** → **API Keys** → copy Live **Secret key** (`sk_live_...`)
5. Stripe → **Developers** → **Webhooks** → **Add endpoint** (same URL, same events)
6. Copy new Live **Webhook secret** (`whsec_...`)

Update these 4 variables in Vercel with Live values:
- `STRIPE_SECRET_KEY` → `sk_live_...`
- `STRIPE_WEBHOOK_SECRET` → `whsec_...` (new live one)
- `STRIPE_MONTHLY_PRICE_ID` → new live price ID
- `STRIPE_LIFETIME_PRICE_ID` → new live price ID

Redeploy → you're accepting real payments.

---

## PART 9 — One placeholder to replace in index.html

Open `index.html` on GitHub → pencil edit → find and replace:
- `YOUR_GUMROAD_RECIPE_PACK` → your recipe PDF link (appears twice)

That's the only remaining placeholder.

---

## PART 10 — Managing subscribers

### When someone buys monthly
Stripe handles the recurring charge automatically every month.
They keep their password as long as their subscription is active.

### When someone cancels
1. Stripe sends you an email notification
2. Go to Vercel → Environment Variables
3. Change `PREMIUM_PASSWORD_MONTHLY` to a new password
4. Email your active subscribers the new password
5. Cancelled subscriber's old password stops working

### When someone buys lifetime
They keep their password forever. Never change `PREMIUM_PASSWORD_LIFETIME`.

### How to see your subscribers
Stripe dashboard → **Customers** → see everyone who has bought

### How to issue refunds
Stripe → **Payments** → find the payment → **Refund**

---

## Your pricing at a glance

| Plan | Price | Stripe fee | You receive |
|---|---|---|---|
| Monthly | $5.99/mo | $0.47 | **$5.52/mo** |
| Lifetime | $29.00 | $1.14 | **$27.86** |

---

## Quick reference — what to do when things happen

| Situation | Action |
|---|---|
| Someone says they didn't get password email | Check Resend dashboard → Logs → resend manually |
| API costs spiking | Lower `MONTHLY_FREE_CAP` in Vercel |
| Someone reports tool is slow | Check Vercel → Functions → logs for errors |
| Subscriber cancels | Change `PREMIUM_PASSWORD_MONTHLY`, email active users |
| Want to raise price | Update in Stripe + update text in index.html |
| Anthropic API down | Tool shows "something went wrong" — check status.anthropic.com |
