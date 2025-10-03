async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = ''; for await (const c of req) raw += c;
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
const { search } = require('./search.js');

const NEEDS_FRESH = [
  'today','current','latest','this week','this month','now','breaking','news',
  'rate','rates','pmms','mba','yield','treasury','inflation','cpi','fed','fomc','mortgage','points'
];

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

    // quick ping
    const first = (msgs[0]?.content||'').trim().toLowerCase();
    if (first === 'ping') { res.status(200).json({ reply: 'pong' }); return; }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) { res.status(500).json({ error: 'Missing OPENAI_API_KEY in env' }); return; }

    const model = process.env.CHAT_MODEL || 'gpt-4o-mini';
    const userText = (msgs.slice().reverse().find(m => m.role === 'user')?.content || '').slice(0, 800);

    // Decide if we should search (or allow forcing it for tests)
    const force = !!body.forceSearch;
    let context = '';
    let sources = [];

    if (force || likelyNeedsFresh(userText)) {
      try {
        const q = userText || 'mortgage rates today California';
        const { answer, items } = await search(q, { search_depth: 'basic' });
        sources = items;
        const lines = items.map(it => \(\) \ — \\n\\).join('\n\n');
        context = [
          'FRESH CONTEXT (summaries & links):',
          lines || '(no results returned)',
          answer ? \\\nAggregate signal: \\ : ''
        ].join('\n');
      } catch (e) {
        context = 'FRESH CONTEXT: (search unavailable)';
      }
    }

    const system = {
      role: 'system',
      content: [
        'You are GPT-5 Thinking for HomeRates.ai.',
        'If FRESH CONTEXT is provided, prefer it for time-sensitive facts.',
        'Write in short clean paragraphs. Use plain dashes for bullets.',
        'Do NOT output Markdown code fences or stray ** or ##.',
        'Finish with a concise Sources: list (up to 5 items) like "- Title – URL".'
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

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + OPENAI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    if (!r.ok) { res.status(r.status).json({ error: 'Upstream error', detail: text.slice(0,1000) }); return; }

    let j = {}; try { j = JSON.parse(text); } catch {}
    const reply = j?.choices?.[0]?.message?.content?.trim() || '';

    res.status(200).json({ reply, sources });
  } catch (err) {
    res.status(500).json({ error: 'Function crash', detail: String(err?.stack || err) });
  }
};