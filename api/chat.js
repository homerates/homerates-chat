const { json } = require('./_nodejson.js');
const { search } = require('./search.js');

function readBody(req){
  return new Promise((resolve)=>{
    try{
      if (req.body && typeof req.body === 'object') return resolve(req.body);
      let raw=''; req.on('data',c=>raw+=c); req.on('end',()=>{ try{ resolve(raw?JSON.parse(raw):{});}catch{resolve({});}});
    }catch{ resolve({}); }
  });
}

const FRESH_HINTS = [
  'today','current','latest','this week','this month','now','breaking','news',
  'rate','rates','pmms','mba','yield','treasury','inflation','cpi','fed','fomc','mortgage','points'
];
function likelyNeedsFresh(q=''){ const s=q.toLowerCase(); return FRESH_HINTS.some(k=>s.includes(k)); }

async function trySearch(userText){
  if (!process.env.TAVILY_API_KEY) return { context:'', sources:[] }; // silent skip if no key
  try{
    const q = userText || 'mortgage rates today';
    const { answer, items } = await search(q, { search_depth:'basic' });
    const lines = items.map(it => ()  — \n).join('\n\n');
    const context = [
      'FRESH CONTEXT (summaries & links):',
      lines || '(no results returned)',
      answer ? \nAggregate signal:  : ''
    ].join('\n');
    return { context, sources: items };
  }catch(e){
    return { context:'FRESH CONTEXT: (search unavailable)', sources:[] }; // never throw
  }
}

module.exports = async (req, res) => {
  try{
    if (req.method !== 'POST') return json(res,405,{error:'Method not allowed'});
    const body = await readBody(req);
    const msgs = Array.isArray(body?.messages) ? body.messages : null;
    if (!msgs?.length) return json(res,400,{error:'Missing messages array'});

    const first = (msgs[0]?.content||'').trim().toLowerCase();
    if (first === 'ping') return json(res,200,{reply:'pong'});

    const KEY = process.env.OPENAI_API_KEY;
    if (!KEY) return json(res,500,{error:'Missing OPENAI_API_KEY in env'});

    const userText = (msgs.slice().reverse().find(m=>m.role==='user')?.content||'').slice(0,900);
    let context = ''; let sources = [];
    if (body.forceSearch || likelyNeedsFresh(userText)) {
      const s = await trySearch(userText);
      context = s.context; sources = s.sources;
    }

    const system = {
      role:'system',
      content:[
        'You are GPT-5 Thinking for HomeRates.ai.',
        'If FRESH CONTEXT is provided, prefer it for time-sensitive facts.',
        'Write in short clean paragraphs; use plain "-" for bullets.',
        'Do NOT output Markdown code fences or stray ** or ##.',
        'Finish with a short Sources: list (up to 5): "- Title – URL".'
      ].join(' ')
    };

    const payload = {
      model: process.env.CHAT_MODEL || 'gpt-4o-mini',
      temperature: body.temperature ?? 0.4,
      top_p: body.top_p ?? 0.9,
      max_tokens: Number(process.env.RESPONSE_MAX_TOKENS || 900),
      messages: [ system, ...(context?[{role:'system',content:context}]:[]), ...msgs ]
    };

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{ 'Authorization':'Bearer '+KEY, 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    if (!r.ok) return json(res, r.status, { error:'Upstream error', detail: text.slice(0,800) });

    let j={}; try{ j=JSON.parse(text);}catch{}
    const reply = j?.choices?.[0]?.message?.content?.trim() || '';
    return json(res,200,{ reply, sources });
  }catch(err){
    return json(res,500,{ error:'Function crash', detail:String(err?.stack||err) });
  }
};
module.exports.config = { runtime: 'nodejs18.x' };