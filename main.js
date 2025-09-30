const API_URL = 'https://chat.homerates.ai/api/chat'; // force correct project/domain

const \ = document.getElementById('thread');
const \   = document.getElementById('composer');
const \  = document.getElementById('input');
const \   = document.getElementById('send');
const \ = document.getElementById('statusBadge');
const \    = document.getElementById('statusDot');

const messages = [
  { role:'system',
    content:'You are GPT-5 Thinking, an expert California mortgage guide for HomeRates.ai. Educational only, not a commitment to lend. State assumptions. Tailor to CA rules for Access Zero, DSCR, Jumbo Advantage, FHA/VA. No emojis.' }
];

function ok(){ if(\){\.textContent='ready';} if(\){\.style.background='#39d98a';} }
function warn(msg){ if(\){\.textContent=msg;} if(\){\.style.background='#eab308';} }
function bad(msg){ if(\){\.textContent=msg;} if(\){\.style.background='#ef4444';} }

function esc(s){ return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
function render(role,text){
  const div=document.createElement('div');
  div.className=msg ;
  div.innerHTML=<div class="who"></div><div class="bubble"></div>;
  \.appendChild(div);
  \.scrollTop=\.scrollHeight;
}

async function callAPI(payload){
  const r = await fetch(API_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload),
  });
  if(!r.ok){
    const t = await r.text().catch(()=>r.statusText);
    throw new Error(API : );
  }
  return r.json();
}

function busy(b){ \.disabled=b; \.disabled=b; }

window.addEventListener('load',()=>{ ok(); });

\.addEventListener('submit', async e=>{
  e.preventDefault();
  const text=(\.value||'').trim(); if(!text) return;
  render('user', text); \.value=''; messages.push({role:'user',content:text}); busy(true);

  const ghost=document.createElement('div');
  ghost.className='msg assistant';
  ghost.innerHTML='<div class="who">AI</div><div class="bubble">…thinking</div>';
  \.appendChild(ghost); \.scrollTop=\.scrollHeight;

  try{
    const data=await callAPI({messages});
    ghost.remove();
    const reply=data?.reply || 'Sorry — I didn’t catch that.';
    render('assistant', reply);
    messages.push({role:'assistant', content: reply});
  }catch(err){
    ghost.remove();
    bad('API error'); render('assistant', 'Error: '+err.message);
  }finally{
    busy(false); \.focus();
  }
});

// Seed intro so the canvas isn’t empty
render('assistant',
  'Welcome. Share price, down payment, and credit score for a quick ballpark and best-structure notes (seller credit vs price cut, Access Zero, points).\\n\\nNote: Educational only; CA rules.'
);