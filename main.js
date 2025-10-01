const \ = document.getElementById('thread');
const \   = document.getElementById('composer');
const \  = document.getElementById('input');
const \   = document.getElementById('send');
const \    = document.getElementById('statusDot');

const API_CHAT = '/api/chat'; // works on both domains

const messages = [
  { role:'system',
    content:'You are GPT-5 Thinking, a CA mortgage guide for HomeRates.ai. Educational only; not a commitment to lend. State assumptions. Tailor to CA rules for Access Zero, DSCR, Jumbo Advantage, FHA/VA. No emojis.' }
];

function setDot(color){ if(\) \.style.background=color; }
function esc(s){ return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
function render(role,text){
  const div=document.createElement('div');
  div.className=\msg \\;
  div.innerHTML=\<div class="who">\</div><div class="bubble">\</div>\;
  \.appendChild(div);
  \.scrollTop=\.scrollHeight;
}
async function callAPI(payload){
  const r = await fetch(API_CHAT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const t = await r.text(); let j={}; try{ j=JSON.parse(t);}catch{}
  if(!r.ok) throw new Error(j?.detail || j?.error || t || ('HTTP '+r.status));
  return j;
}
function busy(b){ \.disabled=b; \.disabled=b; }

render('assistant','Welcome. Share price, down payment, and credit score for a quick ballpark and best-structure notes (seller credit vs price cut, Access Zero, points).\\n\\nNote: Educational only; CA rules.');
setDot('#39d98a');

\.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const text=(\.value||'').trim(); if(!text) return;
  render('user', text); \.value=''; busy(true);
  const ghost=document.createElement('div'); ghost.className='msg assistant'; ghost.innerHTML='<div class="who">AI</div><div class="bubble">…thinking</div>'; \.appendChild(ghost);
  messages.push({ role:'user', content:text });

  try{
    const data=await callAPI({ messages });
    ghost.remove();
    const reply=data?.reply || 'Sorry — I didn’t catch that.';
    render('assistant', reply);
    messages.push({ role:'assistant', content: reply });
    setDot('#39d98a');
  }catch(err){
    ghost.remove();
    render('assistant','Error: '+err.message);
    setDot('#ef4444');
  }finally{
    busy(false); \.focus();
  }
});