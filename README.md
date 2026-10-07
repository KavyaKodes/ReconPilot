# ReconPilot

An AI reconciliation copilot for PayPal sellers. It pulls PayPal sandbox transactions into an AG Grid table, scans for problems (duplicate charges, abnormal fees, orphan or oversized refunds), and lets you filter the grid by asking in plain language. Built for the "Build What's Next with PayPal and AI" hackathon.

## What it does
- **Ask your grid:** type "refunds over $100" or "fees above 5%". the model calls an `apply_filters` tool and the app turns the result into AG Grid filter models.
- **Scan for problems:** deterministic rules flag issues; the AI then summarises them, estimates exposure and says what to fix first.
- **Export:** download only the flagged rows as CSV for your accountant.

## Tools used
- **PayPal** sandbox: OAuth token + Transaction Search API (`/v1/reporting/transactions`) in `paypal.js`.
- **Google Gemini API** (free tier; Claude also supported): function calling turns plain-language requests into grid filters, and summarizes flagged problems, in `ai.js`.
- **AG Grid Community** (MIT): the transactions grid, filters, row styling, CSV export.
- **Render**: hosting (see below).

## Run locally
```bash
npm install
cp .env.example .env     # add your keys
npm start                # http://localhost:3000
```
Without keys the app still runs on built-in demo data with planted problems and a keyword-based filter fallback. Add `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` (sandbox app with Transaction Search enabled) for live sandbox data, and `GEMINI_API_KEY` (free from aistudio.google.com) for the AI features. If your sandbox account has no transactions, the app uses demo data.

## Deploy on Render
New > Web Service > connect this repo. Build command `npm install`, start command `npm start`. Add the env vars from `.env.example`.

## License
MIT
