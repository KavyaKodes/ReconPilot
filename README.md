# ReconPilot

An AI reconciliation copilot for PayPal sellers. It pulls PayPal sandbox transactions into an AG Grid table, scans for problems (duplicate charges, abnormal fees, orphan or oversized refunds), and lets you filter the grid by asking in plain language. Built for the "Build What's Next with PayPal and AI" hackathon.

## What it does
- **Ask your grid:** type "refunds over $100" or "fees above 5%". The model calls an `apply_filters` tool and the app turns the result into AG Grid filter models.
- **Scan for problems:** deterministic rules flag issues, then the AI summarises them, estimates the money at risk and says what to fix first.
- **Recovery invoice:** click a flagged refund and the app calls the PayPal Invoicing API to draft an invoice for the money to recover. If the sandbox app lacks the Invoicing permission, it shows a preview and says nothing was created.
- **Export:** download only the flagged rows as CSV for your accountant.

## About the data
A new PayPal sandbox account has very few transactions, so the grid shows your real sandbox transactions together with a generated demo ledger of about 250 rows with deliberately planted errors. The **Source** column shows which rows are "PayPal sandbox" and which are "Demo".

## Tools used
- **PayPal sandbox:** OAuth token, Transaction Search API (`/v1/reporting/transactions`) and Invoicing API (`/v2/invoicing/invoices`) in `paypal.js`.
- **Google Gemini API (free tier; Claude also supported):** function calling turns plain-language requests into grid filters, and text generation summarises flagged problems, in `ai.js`.
- **AG Grid Community (MIT):** transactions grid, filters, row styling, CSV export.
- **Node.js and Express:** backend that keeps API keys off the browser.
- **Antigravity:** AI coding editor used during development.
- **AI assistance:** parts of the code were written with AI coding assistants (Claude and Gemini).

## Run locally
1. Install Node.js (LTS) from nodejs.org.
2. In a terminal inside this folder, run:
```
npm install
```
3. Copy `.env.example` to a new file named `.env` (Windows: `copy .env.example .env`, Mac/Linux: `cp .env.example .env`) and add your keys.
4. Start the app:
```
npm start
```
5. Open http://localhost:3000

Without any keys the app still runs on the demo ledger with a keyword-based filter fallback. Add `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` (a sandbox app with Transaction Search enabled, and Invoicing for the recovery invoice) for live sandbox data. Add `GEMINI_API_KEY` (free from aistudio.google.com) for the AI features.

For the AI features, get a free Gemini key at aistudio.google.com and put it in .env as GEMINI_API_KEY. Without it, the app still runs with simple keyword filters.

## License
MIT
