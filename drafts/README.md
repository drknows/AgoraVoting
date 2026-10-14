# Unfinished live-data routes (not deployed)

These routes were started but not finished or tested against the real data sources
(SEC EDGAR, NIH RePORTER, USAspending, NLM Clinical Tables, CMS Marketplace, Stooq).
They live outside `api/` so Vercel does not deploy them. Until they are finished,
the site shows "coming soon" for these features (see `api/[...path].js`).

To finish one: complete it, test it against the live source, then move it into `api/`
(and `_lib/prices.js` into `api/_lib/`).

Still to build from scratch: `drug.js` (drug lookup) and `rates.js` (Medicare reimbursement rates).
