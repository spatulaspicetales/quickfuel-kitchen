# ⚡ QuickFuel Kitchen

> An AI-powered recipe tool that transforms any ingredients into a 10-minute meal — built for busy professionals and students. Also generates ready-to-post Instagram content in the Spatula · Spice · Tale format.

**[➜ Try it live](https://quickfuel-kitchen.vercel.app)** ← replace with your URL

---

## What it does

### 🍳 Recipe mode
Type whatever's in your fridge — even 2 or 3 ingredients — and get a real recipe in seconds:
- Dish name + cook time (always under 10 minutes)
- Ingredient list with amounts
- Step-by-step instructions (max 6 steps, beginner-friendly)
- Nutrition snapshot (high protein, balanced, etc.)
- Budget tip or ingredient swap

### 📱 IG content mode
Describe your dish and get a complete ready-to-post Instagram package:
- Scroll-stopping hook
- Caption in Spatula · Spice · Tale format
- Punchline
- 20–25 hashtags (broad + niche mix)
- 5 comment reply options

---

## The Spatula · Spice · Tale framework

Every piece of content follows this structure:

| Element | What it does | Examples |
|---|---|---|
| **Spatula** | Cooking action + texture | sizzling, crispy, golden, drizzling |
| **Spice** | Flavor + sensory detail | creamy, smoky, garlicky, tangy |
| **Tale** | Relatable emotion | long day after work, late-night craving |

---

## Why I built this

I'm a software engineer and food creator — and I got tired of people asking me "what do I do with these random ingredients?" A generic recipe app wasn't the answer. This tool gives you something real, fast, and affordable using exactly what you have.

The content mode exists because creating IG content for every meal takes time. This handles the words so you can focus on the cooking.

---

## Tech stack

| Layer | Tech | Cost |
|---|---|---|
| Frontend | Single HTML file | Free |
| Backend | Vercel serverless function | Free |
| AI | Anthropic Claude API | ~$0.003/request |
| Hosting | Vercel Hobby plan | Free forever |

**No database. No login system. No monthly SaaS fees.**

---

## How to deploy your own copy

### What you need
- A GitHub account (free)
- A Vercel account (free) — sign up at vercel.com with GitHub
- An Anthropic API key (free to start) — get one at console.anthropic.com

### File structure
```
quickfuel-kitchen/
├── api/
│   └── generate.js     ← secure backend (your API key lives here)
├── index.html          ← the full tool
├── vercel.json         ← deployment config
├── package.json        ← Node.js config
└── README.md           ← this file
```

### Deploy in 4 steps

**1. Fork or clone this repo**

**2. Upload to GitHub**
- Create a new public repo named `quickfuel-kitchen`
- Upload all files — make sure `generate.js` is inside an `api/` folder

**3. Import to Vercel**
- Go to vercel.com → Add New Project → import your repo
- Leave all settings as default → click Deploy

**4. Add your API key**
- Vercel dashboard → your project → Settings → Environment Variables
- Add: Name = `ANTHROPIC_API_KEY`, Value = your `sk-ant-...` key
- Check all 3 environment boxes → Save
- Go to Deployments → Redeploy

Your tool is live at `your-project-name.vercel.app`

### Customize it
Open `index.html` and replace:

| Placeholder | Replace with |
|---|---|
| `YOUR_GUMROAD_LINK` | Your Gumroad product URL (appears 3 times) |

---

## Cost breakdown

| Monthly users | API cost | If 1% buy $12 recipe pack |
|---|---|---|
| 500 | ~$1.50 | $60 revenue |
| 1,000 | ~$3.00 | $120 revenue |
| 5,000 | ~$15.00 | $600 revenue |
| 10,000 | ~$30.00 | $1,200 revenue |

The tool pays for itself at any scale.

---

## Recipe rules (baked into the AI)

- 10 minutes or less, always
- Affordable, accessible ingredients only
- Beginner-friendly — no complex techniques
- Balanced nutrition where possible (protein + carbs + fats)
- Budget tip or swap on every recipe
- Tone: warm, friendly, practical — like a helpful friend

---

## Security

Your Anthropic API key is stored as an encrypted environment variable on Vercel's servers. It never appears in the HTML, never touches the browser, and is never exposed to users. The `api/generate.js` serverless function acts as a secure proxy between your frontend and the Anthropic API.

---

## License

MIT — free to use, modify, and build on. Credit appreciated but not required.

---

Made by [@spatulaspiceandtales](https://instagram.com/spatulaspiceandtales)  
Follow for weekly recipes, design content, and free tools.
