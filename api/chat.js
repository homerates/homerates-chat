const { json } = require('./_nodejson.js');

function readBody(req){
  return new Promise((resolve) => {
    try {
      if (req.body && typeof req.body === 'object') return resolve(req.body);
      let raw = '';
      req.on('data', (c) => raw += c);
      req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } });
    } catch { resolve({}); }
  });
}

async function handler(req, res) {
  try {
    if (req.method !== 'POST') { json(res, 405, { error: 'Method not allowed' }); return; }

    const body = await readBody(req);
    const msgs = Array.isArray(body?.messages) ? body.messages : null;
    if (!msgs?.length) { json(res, 400, { error: 'Missing messages array' }); return; }

    // quick ping
    const first = (msgs[0]?.content || '').trim().toLowerCase();
    if (first === 'ping') { json(res, 200, { reply: 'pong' }); return; }

    const KEY = process.env.OPENAI_API_KEY;
    if (!KEY) { json(res, 500, { error: 'Missing OPENAI_API_KEY in env' }); return; }

    const system = {
      role:'system',
      content:'You are GPT-5 Thinking for HomeRates.ai. Write in short clean paragraphs; use plain dashes for bullets. No code fences, no stray ** or ##.'
    };
    const payload = {
      model: process.env.CHAT_MODEL || 'gpt-4o-mini',
      temperature: body.temperature ?? 0.4,
      top_p: body.top_p ?? 0.9,
      max_tokens: Number(process.env.RESPONSE_MAX_TOKENS || 900),
      messages: [system, ...msgs]
    };

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{ 'Authorization':'Bearer '+KEY, 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    if (!r.ok) { json(res, r.status, { error:'Upstream error', detail: text.slice(0,800) }); return; }

    let j={}; try{ j=JSON.parse(text); }catch{}
    json(res, 200, { reply: j?.choices?.[0]?.message?.content?.trim() || '' });
  } catch (err) {
    json(res, 500, { error:'Function crash', detail:String(err?.stack||err) });
  }
}
module.exports = handler;
module.exports.config = { runtime: 'nodejs18.x' };