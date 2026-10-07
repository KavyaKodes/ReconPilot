const URL = 'https://api.anthropic.com/v1/messages';
const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
async function call(body) {
  const res = await fetch(URL, { method: 'POST', headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL(), max_tokens: 1000, ...body }) });
  if (!res.ok) throw new Error('Anthropic error ' + res.status + ': ' + (await res.text()).slice(0, 200));
  return res.json();
}
const tools = [{
  name: 'apply_filters',
  description: 'Filter the transactions grid. Pass an empty list to clear all filters. Columns: type (Sale/Refund/Payout), status, customer, amount, fee, feePct (fee as percent of sale), date (ISO), flag (anomaly reason text, empty if none).',
  input_schema: { type: 'object', properties: { filters: { type: 'array', items: { type: 'object', properties: {
    column: { type: 'string', enum: ['type','status','customer','amount','fee','feePct','date','flag'] },
    operator: { type: 'string', enum: ['equals','contains','greaterThan','lessThan'] },
    value: { type: ['string','number'] } }, required: ['column','operator','value'] } },
    reply: { type: 'string', description: 'One short sentence telling the user what was applied.' } }, required: ['filters','reply'] } }];
async function askClaude(question) {
  const data = await call({ tools, tool_choice: { type: 'tool', name: 'apply_filters' },
    system: 'You control a PayPal transactions grid. Translate the user request into filters. Refunds are stored with negative amounts. For "flagged"/"problems" use column flag, operator contains, value "".',
    messages: [{ role: 'user', content: question }] });
  const use = data.content.find(c => c.type === 'tool_use');
  return use.input;
}
async function summarizeClaude(tx, flags) {
  const items = Object.entries(flags).map(([id, reason]) => { const t = tx.find(x => x.id === id); return `${id} | ${t.type} | ${t.customer} | ${t.amount} | ${reason}`; });
  const data = await call({ system: 'You are a bookkeeping assistant for a small online seller. Be concise and concrete.',
    messages: [{ role: 'user', content: `These PayPal transactions were flagged by rules:\n${items.join('\n')}\n\nIn under 120 words: group them into the 3 issue types, estimate the dollar exposure, and say what to do first.` }] });
  return data.content.filter(c => c.type === 'text').map(c => c.text).join('');
}
// Offline fallback so the demo never dies without a key.
function fallback(q) {
  q = q.toLowerCase(); const f = [];
  if (/refund/.test(q)) f.push({ column: 'type', operator: 'equals', value: 'Refund' });
  if (/flag|problem|issue|anomal/.test(q)) f.push({ column: 'flag', operator: 'contains', value: '' });
  const m = q.match(/(\d+(\.\d+)?)\s*%/); if (m && /fee/.test(q)) f.push({ column: 'feePct', operator: 'greaterThan', value: parseFloat(m[1]) });
  const d = q.match(/\$\s*(\d+)/); if (d) { const small = /under|below|less/.test(q), neg = /refund/.test(q); f.push({ column: 'amount', operator: (small !== neg) ? 'lessThan' : 'greaterThan', value: neg ? -d[1] : +d[1] }); }
  return { filters: f, reply: 'Offline mode (no API key): applied simple keyword filters.' };
}


// ---- Google Gemini (free tier) ----
const GEM = () => `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${process.env.GEMINI_API_KEY}`;
async function gem(body) {
  const res = await fetch(GEM(), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('Gemini error ' + res.status + ': ' + (await res.text()).slice(0, 200));
  return res.json();
}
async function askGemini(question) {
  const t = tools[0], props = t.input_schema.properties;
  const decl = { name: t.name, description: t.description, parameters: { type: 'object', properties: {
    filters: { type: 'array', items: { type: 'object', properties: {
      column: { type: 'string', enum: props.filters.items.properties.column.enum },
      operator: { type: 'string', enum: props.filters.items.properties.operator.enum },
      value: { type: 'string', description: 'Number as digits, e.g. "100"' } }, required: ['column', 'operator', 'value'] } },
    reply: { type: 'string', description: props.reply.description } }, required: ['filters', 'reply'] } };
  const data = await gem({ systemInstruction: { parts: [{ text: 'You control a PayPal transactions grid. Translate the user request into filters. Refunds are stored with negative amounts, so "refunds over $100" means type equals Refund and amount lessThan -100. For "flagged"/"problems" use column flag, operator contains, value "".' }] },
    contents: [{ role: 'user', parts: [{ text: question }] }], tools: [{ functionDeclarations: [decl] }],
    toolConfig: { functionCallingConfig: { mode: 'ANY', allowedFunctionNames: [t.name] } } });
  const part = data.candidates[0].content.parts.find(p => p.functionCall);
  return part.functionCall.args;
}
async function summarizeGemini(tx, flags) {
  const items = Object.entries(flags).map(([id, reason]) => { const t = tx.find(x => x.id === id); return `${id} | ${t.type} | ${t.customer} | ${t.amount} | ${reason}`; });
  const data = await gem({ contents: [{ role: 'user', parts: [{ text: `You are a bookkeeping assistant for a small online seller. These PayPal transactions were flagged by rules:\n${items.join('\n')}\n\nIn under 120 words: group them into the 3 issue types, estimate the dollar exposure, and say what to fix first.` }] }] });
  return data.candidates[0].content.parts.map(p => p.text || '').join('');
}
const provider = () => process.env.GEMINI_API_KEY ? 'gemini' : process.env.ANTHROPIC_API_KEY ? 'claude' : null;
const ask = q => provider() === 'gemini' ? askGemini(q) : askClaude(q);
const summarize = (tx, f) => provider() === 'gemini' ? summarizeGemini(tx, f) : summarizeClaude(tx, f);
module.exports = { ask, summarize, fallback, provider };
