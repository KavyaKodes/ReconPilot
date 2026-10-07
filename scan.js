// Rule-based anomaly detection (fast, deterministic). Claude then explains and prioritises the results.
module.exports = function scan(tx) {
  const flags = {}, add = (id, reason) => (flags[id] = flags[id] ? flags[id] + '; ' + reason : reason);
  const sales = tx.filter(t => t.type === 'Sale');
  for (const t of sales) if (t.amount > 0 && t.fee / t.amount > 0.07) add(t.id, `High fee (${(t.fee / t.amount * 100).toFixed(1)}% of sale)`);
  const seen = {};
  for (const t of sales) {
    const k = t.customer + '|' + t.amount;
    const prev = seen[k];
    if (prev && Math.abs(new Date(t.date) - new Date(prev.date)) < 600e3) add(t.id, `Possible duplicate of ${prev.id}`);
    seen[k] = t;
  }
  const byOrder = Object.fromEntries(sales.map(s => [s.orderId, s]));
  for (const t of tx.filter(t => t.type === 'Refund')) {
    const s = byOrder[t.orderId];
    if (!s) add(t.id, 'Refund with no matching sale');
    else if (Math.abs(t.amount) > s.amount + 0.01) add(t.id, `Refund exceeds original sale (${s.id})`);
  }
  return flags;
};
