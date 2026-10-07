require('dotenv').config();
const express = require('express'), path = require('path');
const seed = require('./seed'), scan = require('./scan'), ai = require('./ai'), paypal = require('./paypal');
const app = express(); app.use(express.json()); app.use(express.static(path.join(__dirname, 'public')));
const hasPayPal = () => process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET;
const hasAI = () => !!ai.provider();
let cache = null;
async function load(force) {
  if (cache && !force) return cache;
  let tx = seed(), source = 'demo';
  if (hasPayPal()) { try { const live = await paypal.fetchTransactions(); if (live.length) { tx = live; source = 'paypal-sandbox'; } } catch (e) { console.error(e.message); } }
  const flags = scan(tx);
  tx = tx.map(t => ({ ...t, feePct: t.type === 'Sale' && t.amount > 0 ? +(t.fee / t.amount * 100).toFixed(2) : 0, flag: flags[t.id] || '' }));
  return (cache = { tx, flags, source });
}
app.get('/api/transactions', async (req, res) => { const d = await load(req.query.refresh); res.json({ source: d.source, ai: hasAI(), transactions: d.tx }); });
app.post('/api/ask', async (req, res) => {
  const q = String(req.body.question || '').slice(0, 500);
  try { res.json(hasAI() ? await ai.ask(q) : ai.fallback(q)); } catch (e) { console.error(e.message); res.json(ai.fallback(q)); }
});
app.get('/api/scan', async (req, res) => {
  const d = await load(); let summary = `${Object.keys(d.flags).length} transactions flagged.`;
  if (hasAI() && Object.keys(d.flags).length) { try { summary = await ai.summarize(d.tx, d.flags); } catch (e) { console.error(e.message); } }
  res.json({ count: Object.keys(d.flags).length, summary });
});
app.listen(process.env.PORT || 3000, () => console.log('ReconPilot on http://localhost:' + (process.env.PORT || 3000)));
