const \ = document.getElementById('thread');
const \   = document.getElementById('composer');
const \  = document.getElementById('input');
const \   = document.getElementById('send');

const messages = [
  { role:'system', content:"You are GPT-5, a CA mortgage guide. Educational only, not a commitment to lend." }
];

function render(role,text){
  const div=document.createElement('div');
  div.className='msg '+role;
  div.innerHTML=\<div class="bubble">\</div>\;
  \.appendChild(div);
  \.scrollTop=\.scrollHeight;
}

async function apiSend(payload){
  const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

\.addEventListener('submit',async e=>{
  e.preventDefault();
  const text=(\.value||'').trim(); if(!text) return;
  render('user',text); \.value=''; messages.push({role:'user',content:text});
  const ghost=document.createElement('div'); ghost.className='msg assistant'; ghost.innerHTML='<div class="bubble">…thinking</div>'; \.appendChild(ghost);
  try{
    const data=await apiSend({messages});
    ghost.remove(); render('assistant',data.reply); messages.push({role:'assistant',content:data.reply});
  }catch(err){ ghost.remove(); render('assistant','Error: '+err.message); }
});
render('assistant',"Welcome. Share price, DP, credit score and I can ballpark payments (CA only).");