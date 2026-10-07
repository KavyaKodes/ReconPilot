// Deterministic demo data shaped like PayPal Transaction Search results,
// with planted problems for the scanner to find.
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
const names = ['Priya Shah','Marco Rossi','Lena Fischer','Omar Haddad','Aiko Tanaka','Sam Carter','Nia Okafor','Diego Ruiz','Hana Kim','Tom Becker'];
module.exports = function seed() {
  const r = rng(42), tx = []; let n = 1000;
  const base = new Date('2026-09-01T09:00:00Z').getTime();
  for (let i = 0; i < 240; i++) {
    const amount = Math.round((15 + r() * 285) * 100) / 100;
    tx.push({ id: 'TX' + n++, date: new Date(base + i * 3.2 * 3600e3).toISOString(), customer: names[Math.floor(r() * names.length)],
      type: 'Sale', amount, fee: Math.round((amount * 0.0349 + 0.49) * 100) / 100, status: 'Completed', orderId: 'ORD' + (5000 + i) });
  }
  const sales = tx.slice();
  // Planted problems
  for (const i of [20, 75, 130]) { const d = { ...sales[i], id: 'TX' + n++, date: new Date(new Date(sales[i].date).getTime() + 90e3).toISOString() }; tx.push(d); }
  for (const i of [33, 90, 150, 200]) sales[i].fee = Math.round(sales[i].amount * (0.08 + r() * 0.03) * 100) / 100;
  for (const i of [10, 60, 110, 180]) tx.push({ id: 'TX' + n++, date: sales[i].date, customer: sales[i].customer, type: 'Refund',
    amount: -sales[i].amount, fee: 0, status: 'Completed', orderId: sales[i].orderId });
  tx.push({ id: 'TX' + n++, date: sales[220].date, customer: 'Unknown Buyer', type: 'Refund', amount: -64.5, fee: 0, status: 'Completed', orderId: 'ORD9999' });
  tx.push({ id: 'TX' + n++, date: sales[50].date, customer: sales[50].customer, type: 'Refund', amount: -sales[50].amount * 2, fee: 0, status: 'Completed', orderId: sales[50].orderId });
  return tx.sort((a, b) => a.date.localeCompare(b.date));
};
