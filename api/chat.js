function readBody(req) {
  return new Promise((resolve) => {
    try {
      if (req.body && typeof req.body === 'object') return resolve(req.body);
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } });
    } catch { resolve({}); }
  });
}

const FRESH_HINTS = [
  'today','current','latest','this week','this month','now','breaking','news',
  'rate','rates','pmms','mba','yield','treasury','inflation','cpi','fed','fomc','mortgage','points'
];

function likelyNeedsFresh(q=''){
  const s = q.toLowerCase();
  return FRESH_HINTS.some(k => s.includes(k));
}

async function trySearch(userText) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return { context: '', sources: [] }; // silently skip if no key

  const body = {
    api_key: key,
    query: userText || 'mortgage rates today California',
    search_depth: 'basic',
    max_results: Math.min(Number(process.env.SEARCH_MAX_RESULTS || 5), 10),
    include_answer: true,
    include_raw_content: false,
    include_images: false
  };

  try {
    const r = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(body)
    });
    const text = await r.text();
    if (!r.ok) throw new Error('Search upstream ' + r.status + ' ' + text.slice(0,200));
    const j = JSON.parse(text);
    const items = Array.isArray(j.results) ? j.results.map((x,i)=>({
      idx: i+1, title: x.title || x.url, url: x.url,
      snippet: (x.content || x.snippet || '').replace(/\s+/g,' ').trim().slice(0,400)
    })) : [];
    const lines = items.map(it => ()  — \n).join('\n\n');
    const context = [
      'FRESH CONTEXT (summaries & links):',
      lines || '(no results returned)',
      j.answer ? \nAggregate signal:  : ''
    ].join('\n');
    return { context, sources: items };
  } catch (e) {
    // Non-fatal: continue without fresh context
    return { context: 'FRESH CONTEXT: (search unavailable)', sources: [] };
  }
}

module.exports = async function (req, res) {
  try {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const body = await readBody(req);
    const msgs = Array.isArray(body?.messages) ? body.messages : null;
    if (!msgs?.length) { res.status(400).json({ error: 'Missing messages array' }); return; }

    const first = (msgs[0]?.content || '').trim().toLowerCase();
    if (first === 'ping') { res.status(200).json({ reply: 'pong' }); return; }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) { res.status(500).json({ error: 'Missing OPENAI_API_KEY in env' }); return; }

    const model = process.env.CHAT_MODEL || 'gpt-4o-mini';
    const userText = (msgs.slice().reverse().find(m => m.role === 'user')?.content || '').slice(0, 900);

    let context = '';
    let sources = [];
    if (body.forceSearch || likelyNeedsFresh(userText)) {
      const resSearch = await trySearch(userText);
      context = resSearch.context;
      sources = resSearch.sources;
    }

    const system = {
      role: 'system',
      content: [
        'You are GPT-5 Thinking for HomeRates.ai.',
        'If FRESH CONTEXT is provided, prefer it for time-sensitive facts.',
        'Write in short clean paragraphs; use plain "-" for bullets.',
        'Do NOT output Markdown code fences or stray ** or ##.',
        'Finish with: Sources: (up to 5 bullets: "- Title – URL").'
      ].join(' ')
    };

    const payload = {
      model,
      temperature: body.temperature ?? 0.4,
      top_p: body.top_p ?? 0.9,
      max_tokens: Number(process.env.RESPONSE_MAX_TOKENS || 900),
      messages: [
        system,
        ...(context ? [{ role: 'system', content: context }] : []),
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