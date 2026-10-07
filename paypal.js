const BASE = 'https://api-m.sandbox.paypal.com';
async function token() {
  const auth = Buffer.from(process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_CLIENT_SECRET).toString('base64');
  const res = await fetch(BASE + '/v1/oauth2/token', { method: 'POST',
    headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
  if (!res.ok) throw new Error('PayPal auth failed: ' + res.status);
  return (await res.json()).access_token;
}
// Transaction Search allows max 31-day windows; we pull the last 30 days.
async function fetchTransactions() {
  const t = await token(), end = new Date(), start = new Date(end - 30 * 864e5);
  const url = `${BASE}/v1/reporting/transactions?start_date=${start.toISOString()}&end_date=${end.toISOString()}&fields=all&page_size=500`;
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + t } });
  if (!res.ok) throw new Error('PayPal transactions failed: ' + res.status + ' ' + (await res.text()).slice(0, 200));
  const data = await res.json();
  return (data.transaction_details || []).map(d => {
    const i = d.transaction_info, p = d.payer_info || {};
    const amount = parseFloat(i.transaction_amount?.value || 0);
    const code = i.transaction_event_code || '';
    return { id: i.transaction_id, date: i.transaction_initiation_date,
      customer: p.payer_name?.alternate_full_name || p.email_address || 'Unknown',
      type: code.startsWith('T11') ? 'Refund' : amount < 0 ? 'Payout' : 'Sale',
      amount, fee: Math.abs(parseFloat(i.fee_amount?.value || 0)),
      status: i.transaction_status === 'S' ? 'Completed' : i.transaction_status,
      orderId: i.invoice_id || i.paypal_reference_id || i.transaction_id };
  });
}
module.exports = { fetchTransactions };
