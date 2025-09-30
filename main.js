const API_CHAT = 'https://chat.homerates.ai/api/chat';
const API_PING = 'https://chat.homerates.ai/api/ping';

const \ = document.getElementById('thread');
const \   = document.getElementById('composer');
const \  = document.getElementById('input');
const \   = document.getElementById('send');
const \  = document.getElementById('statusBadge');
const \    = document.getElementById('statusDot');

function setStatus(txt,color){ if(\) \.textContent=txt; if(\) \.style.background=color; }
function esc(s){ return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
function render(role,text){
  const div=document.createElement('div');
  div.className=\msg \\;
  div.innerHTML=\<div class="who">\</div><div class="bubble">\</div>\;
  \.appendChild(div);
  \.scrollTop=\.scrollHeight;
}

async function postJSON(url, body){
  const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const t = await r.text();
  let j; try{ j = JSON.parse(t); } catch{ j = {raw:t}; }
  return { ok:r.ok, status:r.status, json:j, raw:t };
}

const messages = [
  { role:'system', content:'You are GPT-5 Thinking, a CA mortgage guide. Educational only; state assumptions; CA rules for Access Zero/DSCR/Jumbo/FHA/VA.' }
];

(async function boot(){
  try {
    const ping = await postJSON(API_PING, { time: Date.now() });
    if (ping.ok && ping.json?.ok) {
      setStatus('ready', '#39d98a');
    } else {
      setStatus('ping failed', '#ef4444');
      render('assistant', 'Ping failed: '+(ping.json?.error || ping.status));
    }
  } catch (e) {
    setStatus('ping error', '#ef4444');
    render('assistant', 'Ping error: '+e.message);
  }
})();

\.addEventListener('submit', async e=>{
  e.preventDefault();
  const text=(\.value||'').trim(); if(!text) return;
  render('user',text); \.value='';

  const ghost=document.createElement('div');
  ghost.className='msg assistant';
  ghost.innerHTML='<div class="who">AI</div><div class="bubble">…thinking</div>';
  \.appendChild(ghost); \.scrollTop=\.scrollHeight;

  messages.push({ role:'user', content:text });

  try{
    const resp = await postJSON(API_CHAT, { messages });
    if(!resp.ok){
      setStatus('api '+resp.status, '#ef4444');
      ghost.remove();
      render('assistant', 'API error '+resp.status+': '+(resp.json?.detail || resp.json?.error || resp.raw));
      return;
    }
    const reply = resp.json?.reply || '(empty reply)';
    ghost.remove();
    render('assistant', reply);
    messages.push({ role:'assistant', content: reply });
    setStatus('ready', '#39d98a');
  }catch(err){
    setStatus('network error', '#ef4444');
    ghost.remove();
    render('assistant', 'Network error: '+err.message);
  }
});

// Seed intro text so page is not blank
render('assistant', 'Welcome. Share price, down payment, and credit score for a quick ballpark and best-structure notes (seller credit vs price cut, Access Zero, points).\\n\\nNote: Educational only; CA rules.');