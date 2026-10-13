require('dotenv').config();
const express = require('express'), path = require('path');
const seed = require('./seed'), scan = require('./scan'), ai = require('./ai'), paypal = require('./paypal');
const app = express(); app.use(express.json()); app.use(express.static(path.join(__dirname, 'public')));
const hasPayPal = () => process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET;
const hasAI = () => !!ai.provider();
let cache = null;
async function load(force) {
  if (cache && !force) return cache;
  let tx = seed().map(t => ({ ...t, origin: 'Demo' })), source = 'demo';
  if (hasPayPal()) { try { const live = await paypal.fetchTransactions(); if (live.length) { tx = live.map(t => ({ ...t, origin: 'PayPal sandbox' })).concat(tx).sort((a, b) => a.date.localeCompare(b.date)); source = 'paypal-sandbox'; } } catch (e) { console.error(e.message); } }
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
app.post('/api/recover', async (req, res) => {
  const d = await load(), t = d.tx.find(x => x.id === req.body.id);
  if (!t || t.type !== 'Refund' || !t.flag) return res.json({ ok: false, message: 'Click a flagged refund row first (red row, Type = Refund).' });
  const sale = d.tx.find(x => x.type === 'Sale' && x.orderId === t.orderId);
  const amount = sale ? Math.abs(t.amount) - sale.amount : Math.abs(t.amount);
  if (!(amount > 0)) return res.json({ ok: false, message: 'No money to recover on this row.' });
  const note = `Recovery of $${amount.toFixed(2)} from refund ${t.id}: ${t.flag}`;
  if (!hasPayPal()) return res.json({ ok: true, demo: true, message: `No PayPal keys: would draft a $${amount.toFixed(2)} invoice for ${t.customer}.` });
  try { const inv = await paypal.createRecoveryInvoice({ customer: t.customer, amount, note }); res.json({ ok: true, message: `Draft PayPal invoice created for ${t.customer}: $${amount.toFixed(2)} (invoice ${inv.id}). Find it in your sandbox business account under Invoices.` }); }
  catch (e) { console.error(e.message); if (/ 403 /.test(e.message)) return res.json({ ok: true, demo: true, message: `Invoice preview (not created): $${amount.toFixed(2)} to ${t.customer}. Reason: ${t.flag}. PayPal returned 403, so this app has no Invoicing permission yet; with it enabled the same click creates a real draft invoice.` }); res.json({ ok: false, message: 'PayPal could not create the invoice. Check that Invoicing is enabled on your sandbox app. ' + e.message.slice(0, 150) }); }
});
app.listen(process.env.PORT || 3000, () => console.log('ReconPilot on http://localhost:' + (process.env.PORT || 3000)));
