async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = ''; for await (const c of req) raw += c;
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
const NEEDS_FRESH = [
  'today','current','latest','this week','this month','now','breaking','news',
  'rate','rates','pmms','mba','yield','treasury','inflation','cpi','fed','fomc','mortgage','points'
];
const { search } = require('./search.js');

function likelyNeedsFresh(q=''){
  const s = q.toLowerCase();
  return NEEDS_FRESH.some(k => s.includes(k));
}

module.exports = async function (req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const body = await readBody(req);
    const msgs = Array.isArray(body?.messages) ? body.messages : null;
    if (!msgs?.length) { res.status(400).json({ error: 'Missing messages array' }); return; }

    // Quick ping
    const first = (msgs[0]?.content||'').trim().toLowerCase();
    if (first === 'ping') { res.status(200).json({ reply: 'pong' }); return; }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) { res.status(500).json({ error: 'Missing OPENAI_API_KEY in env' }); return; }
    const model = process.env.CHAT_MODEL || 'gpt-4o-mini';

    // Determine user query text for freshness check
    const userText = (msgs.slice().reverse().find(m => m.role === 'user')?.content || '').slice(0, 600);
    let context = '';
    let sources = [];

    // Try live search if it looks time-sensitive
    if (likelyNeedsFresh(userText)) {
      try {
        const q = userText || 'mortgage rates today California';
        const { answer, items } = await search(q, { search_depth: 'basic' });
        sources = items;
        // Build compact context block for the model
        const lines = items.map(it => ()  — \n).join('\n\n');
        context = [
          'FRESH CONTEXT (summaries & links):',
          lines || '(no results returned)',
          answer ? \nAggregate signal:  : ''
        ].join('\n');
      } catch (e) {
        // Non-fatal: continue without context
        context = 'FRESH CONTEXT: (search unavailable)';
      }
    }

    // System rails
    const system = {
      role: 'system',
      content: [
        'You are GPT-5 Thinking for HomeRates.ai.',
        'If FRESH CONTEXT is provided, prefer it for time-sensitive facts.',
        'Always answer in short clean paragraphs and plain bullet lines starting with "-".',
        'Do NOT output Markdown fences or stray ** or ##.',
        'At the end, include a concise "Sources:" list with up to 5 bullets as " - <title> – <url>".'
      ].join(' ')
    };

    const payload = {
      model,
      temperature: body.temperature ?? 0.4,
      top_p: body.top_p ?? 0.9,
      max_tokens: Number(process.env.RESPONSE_MAX_TOKENS || 900),
      messages: [
        system,
        ...(context ? [{ role:'system', content: context }] : []),
        ...msgs
      ]
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    if (!r.ok) { res.status(r.status).json({ error: "Upstream error", detail: text.slice(0,1000) }); return; }

    let j = {}; try { j = JSON.parse(text); } catch {}
    const reply = j?.choices?.[0]?.message?.content?.trim() || "";

    // Reply includes plain-text Sources list; also return structured sources (optional)
    res.status(200).json({ reply, sources });
  } catch (err) {
    res.status(500).json({ error: "Function crash", detail: String(err?.stack || err) });
  }
};