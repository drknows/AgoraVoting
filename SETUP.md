# Agora — setup and operations

## 1. Turn it on (Vercel)

1. **Database** — Vercel project → **Storage** → **Create Database** → **Neon** (free) → connect it to this project. Tables are created automatically on first use.
2. **Environment variables** — Vercel project → **Settings → Environment Variables**. Copy names from `.env.local.example`. Minimum to launch: `AGORA_SECRET`, `ADMIN_PASSWORD`, `CRON_SECRET` (plus `DATABASE_URL`, which Neon adds).
3. **Redeploy**, sign in at `/admin`, and open **Admin → Setup**. It lists anything still missing.

| Feature | Needs |
|---|---|
| Accounts, community polls, petitions, Crowdsource | Database + `AGORA_SECRET` |
| Email sign-in codes | `RESEND_API_KEY`, `EMAIL_FROM` |
| Phone verification | Twilio variables |
| Photo ID + selfie + SSN (recall/no-confidence signing, official elections) | `STRIPE_SECRET_KEY`, `STRIPE_RESTRICTED_KEY` |
| Daily refresh of House disclosures and report cards | `CRON_SECRET` (schedule is in `vercel.json`) |
| State report cards (automatic economics) | `FRED_API_KEY` |
| Polls imported from state/local ballots | `GOOGLE_CIVIC_API_KEY` |

## 2. Verification levels

| Level | Steps | Unlocks (defaults; adjustable in Admin → Community) |
|---|---|---|
| 1 | Email code | Sign in, Crowdsource |
| 2 | + mobile phone code | Vote in polls, propose, support proposals, sign petitions, test elections |
| 3 | + government photo ID, live selfie, SSN (Stripe Identity) | Recall / no-confidence signatures, official elections |

Agora creates and checks email and phone codes itself. Stripe checks the ID, selfie and SSN. **Agora never stores the SSN, ID images or the selfie** — only the result, the verified legal name (encrypted), and keyed fingerprints that block duplicate accounts and match voter rolls.

## 3. Community polls

- **Proposals** go live automatically when they reach the support threshold (default 25; 100 for recall and no-confidence) within the proposal window (default 14 days).
- **Ballot polls** — Admin → Community → "Create polls from real ballots": federal races from the FEC, and state/local contests and measures from Google Civic (published a few weeks before each election).
- **Signature export** — Admin → Community → "Export signatures" produces a CSV with verified legal names for submission. Most states require recall petitions on official forms; Agora's electronic signatures demonstrate verified support.

## 4. Official elections

- Standard format: **NIST SP 1500-100 v2** (Election Results Common Data Format), JSON.
- **Agora runs voting** (`agora_ballots`): create or import the election → upload the voter roll (CSV: `voter_id,last_name,dob`; stored only as fingerprints) → Schedule/Open → Close → Certify. Results stay sealed until close unless you choose live results.
- **Jurisdiction reports results** (`results_reporting`): create a key in Admin → Official elections → Jurisdiction API keys. The office's system sends:

```
POST https://<your-site>/api/elections
Authorization: Bearer agk_...
Content-Type: application/json

{ "@type": "ElectionResults.ElectionReport", ... }   # NIST 1500-100 v2
```

  Sending the report again with new counts updates the live tracker; `Status: "certified"` certifies it.
- **Ballot secrecy**: ballots are stored with no member ID and no timestamp; participation is stored separately; voters receive a receipt code to confirm inclusion.
- **Audit**: every election has a public hash-chained log (`/api/audit?scope=election:<id>`) that anyone can re-verify.
- **Export**: `/api/elections/<id>?format=cdf` returns results in NIST 1500-100.

> Before using Agora for binding government elections, plan for the jurisdiction's certification, independent security review, accessibility testing, and legal requirements. Internet ballot return is permitted only in limited circumstances in most U.S. states.

## 5. Financial disclosures

- **U.S. House**: synced daily from the House Clerk. Electronically filed reports are read automatically (marked "auto-read"); paper filings link to the PDF.
- **Everyone else** (Senate, President/VP/cabinet via OGE, judges, generals/admirals, governors, legislators, mayors, local officials): Admin → Disclosures → CSV import, or member submissions reviewed by staff. Every entry must link to the official document.
- Federal officials' trades disclosed more than 45 days after the transaction are flagged "Late" (STOCK Act).

## 6. Government report cards

- **Countries**: automatic, daily — World Bank Worldwide Governance Indicators (ethics) and IMF World Economic Outlook data (economy).
- **U.S. states**: automatic economic stability from FRED; other parts by checklist.
- **States, counties, cities**: Admin → Report cards → checklist, each item scored 0–4 with a cited source.
- The full method is shown on the page under "How grades work".
