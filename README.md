# Agora Society Stands

**Nonpartisan, independent tracking of what Americans pay for health care and medicine, and who profits.**

Agora is built for our children, our grandchildren and every generation that follows. Its purpose is to help
all of us leave the world, and our own communities, better than we found them: honest government, ethical
business, and citizens who take part. It serves no party and no company, only the common good.

It only works if **you** take part: participate regularly, offer your own ideas, take lawful steps to change
your government and society, and spread the word to at least 10 other people.

---

## What's in this repository

| Folder | What it is |
| --- | --- |
| `public/` | The website: Home, Agora Pharma, Agora Health, company pages, Polls, Take action, Stand up, About, Privacy, Terms. Plain HTML, CSS and JavaScript. No build step. |
| `api/` | Server routes that run on Vercel: votes and tallies (`vote`, `tally`), reader polls (`polls`, `polls/report`), and reader drug-price reports (`reports`). A catch-all (`[...path].js`) answers "coming soon" for live features not yet connected. |
| `drafts/` | Unfinished live-data routes (SEC filings, NIH grants, federal awards, billing codes, plan comparison, share prices). **Not deployed.** See `drafts/README.md`. |
| `scripts/` | `dev.mjs` runs the site locally; `set-domain.mjs` switches the site to your domain. |
| `test/` | Automated tests for the server routes. |

Everything runs without the server routes too: the trackers, charts and guides are static, and live
features fall back gracefully.

---

## Go live: GitHub + Vercel

You'll need free accounts at [github.com](https://github.com) and [vercel.com](https://vercel.com)
(sign up for Vercel *with* your GitHub account). Plan on about 30 minutes.

### 1. Choose your domain (2 minutes)
The site is written for `agorasocietystands.com`. If you're launching on a different domain, such as
**agorasociety.org**, run this once on your computer (requires [Node.js](https://nodejs.org) 20 or newer):

```bash
node scripts/set-domain.mjs agorasociety.org
```

It updates every canonical link, share link, the sitemap and the `ideas@` / `corrections@` email addresses.

### 2. Put the code on GitHub
**Easiest (no command line):** install [GitHub Desktop](https://desktop.github.com), choose
*File → Add local repository*, pick this folder, then click **Publish repository**.
Keep it **Private** until launch if you prefer.

**Or with the command line:**
```bash
cd agora-society-stands
git remote add origin https://github.com/YOUR-USERNAME/agora-society-stands.git
git push -u origin main
```
(Create the empty repository on github.com first, without a README.)

### 3. Import into Vercel
1. In Vercel, click **Add New → Project** and choose the `agora-society-stands` repository.
2. Framework preset: **Other**. Leave the build command empty. Vercel reads `vercel.json`, which
   serves the `public/` folder and deploys `api/` as server routes.
3. Click **Deploy**. In about a minute you'll have a live preview address like
   `agora-society-stands.vercel.app`.

### 4. Connect storage for votes, polls and price reports
1. In your Vercel project: **Storage → Create Database → Upstash (Redis)** (free tier is plenty to start).
   Connect it to the project; Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you.
2. **Settings → Environment Variables:** add `AGORA_SALT` with a long random value
   (for example, the output of `openssl rand -hex 32`). It protects readers' privacy by hashing
   device IDs and IP addresses.
3. **Deployments → Redeploy** so the new settings take effect.

Without storage the site still works, but votes and polls reset whenever the server restarts.

### 5. Add your domain
1. Vercel project → **Settings → Domains → Add** your domain (and the `www.` version).
2. Vercel shows the DNS records to add. Enter them where you bought the domain.
   HTTPS is set up automatically.
3. Create the email addresses the site uses: `ideas@` and `corrections@` your domain.

### 6. Launch checklist
- [ ] Domain set with `set-domain.mjs`, and live on Vercel with HTTPS
- [ ] Upstash connected, `AGORA_SALT` set, redeployed
- [ ] Cast a test vote on **Polls** from your phone and a computer; both see the count
- [ ] `ideas@` and `corrections@` mailboxes receive mail
- [ ] Privacy and Terms reviewed by your attorney (they name Vercel as the host)
- [ ] Share preview checked by pasting your link into a text message or social post
- [ ] Search engines: add the site in [Google Search Console](https://search.google.com/search-console) and submit `/sitemap.xml`

Every later change you push to GitHub's `main` branch redeploys automatically. Other branches get their
own private preview address, so you can review changes before they go live.

---

## Work on it locally
```bash
npm run dev      # http://localhost:3000, with working server routes (in-memory storage)
npm test         # route tests
```
To use real storage locally, copy `.env.example` to `.env` and fill it in (never commit `.env`).

---

## Future phases of Agora

**Summary.** Agora starts with health care and medicine because rising costs affect every family. From there it
grows step by step: following the money, setting public standards for ethical leadership, organizing in our own
communities, independent reporting, direct citizen participation and, in time, chapters around the world. Each
phase opens when the one before it is stable, sourced and trusted, not on a fixed date, and readers help set the
order.

| Phase | Status | What it adds |
| --- | --- | --- |
| **1. Agora Pharma & Agora Health** | Live now | What Americans pay for medicine and coverage, and who profits: drug prices since 1950, denials and appeals, Medicare, sixteen companies, public polls, advisory shareholder ballots, and the Take action guide. |
| **2. Agora Ledger: follow the money** | Next | Lobbying disclosures, campaign contributions, federal contracts and grants, and government budgets, connected to the companies and officials they touch. More companies: pharmacy benefit managers, hospital systems and generic makers. |
| **3. The Antisociopath Society** | Planned | A membership for people who demand honest government and ethical business. Published, nonpartisan standards; evidence-based ethics grades for companies and leaders with an open scoring method; recognition for those who meet the standard. |
| **4. Agora Civic: your community** | Planned | Find your representatives and how they vote, follow local meetings and ballot measures, join or start a local chapter, and take on service projects. |
| **5. Agora Media** | Planned | Sourced, nonpartisan reporting and plain-language explainers, commentary from verified experts, a public corrections log, and a clear wall between reporting and advocacy. |
| **6. Agora Democratic: citizen participation** | Planned | Verified one-person, one-voice polls, structured deliberation on real proposals, and citizen-written ideas sent to the officials who decide. Advisory and open to everyone, whatever their politics. |
| **7. Agora worldwide** | Future | Local Agora chapters in other countries, in their own languages, under one shared set of values. |

**Technical work to finish within Phase 1** (before or soon after launch):
- Finish and test the live-data routes in `drafts/`: company financials and insider trades (SEC EDGAR),
  merger filings, NIH grant search, federal awards (USAspending), billing-code search, and share prices.
- Build the drug lookup (`/api/drug`) and Medicare reimbursement-rate lookup (`/api/rates`).
- Live plan comparison (`/api/plans`) needs a free CMS Marketplace API key.
- A simple moderator view for reported polls (today, hidden polls are restored by hand in Upstash).

---

## Principles for contributors
- **Every figure links to a public source.** Illustrative or estimated numbers are labeled as such on the page.
- **Nonpartisan.** No endorsements of candidates or parties. Criticism is evidence-based and applied evenly.
- **Lawful and peaceful.** Calls to action point only to legal, nonviolent steps.
- **Privacy first.** No ads, no trackers, no accounts required. Reader data is minimized and hashed.
- **Corrections are fast and public.**

Not investment, legal or medical advice.
