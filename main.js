document.addEventListener('DOMContentLoaded', ()=>{
  const thread = document.getElementById('thread');
  const form   = document.getElementById('composer');
  const input  = document.getElementById('input');
  const send   = document.getElementById('send');
  const badge  = document.getElementById('status');

  const messages = [
    { role:'system', content:'You are GPT-5 Thinking, a CA mortgage guide for HomeRates.ai. Educational only; state assumptions; CA rules for Access Zero, DSCR, Jumbo Advantage, FHA/VA. No emojis.' }
  ];

  const esc = s => (s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const render = (role,text)=>{ const d=document.createElement('div'); d.className='msg '+role; d.innerHTML='<div class="who">'+(role==='user'?'U':'AI')+'</div><div class="bubble">'+esc(text)+'</div>'; thread.appendChild(d); thread.scrollTop=thread.scrollHeight; };
  const set = (t,c)=>{ if(badge){ badge.textContent=t; badge.style.color=c||'#a6a6ad'; } };

  render('assistant','Welcome. Share price, down payment, and credit score for a quick ballpark and best-structure notes (seller credit vs price cut, Access Zero, points).\\n\\nNote: Educational only; CA rules.');
  set('booting...', '#a6a6ad');

  async function post(url, body){
    const r = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const raw = await r.text(); let j={}; try{ j=JSON.parse(raw) }catch{};
    if(!r.ok) throw new Error(j?.detail || j?.error || raw || ('HTTP '+r.status));
    return j;
  }
  async function callAPI(payload){
    try { return await post('/api/chat', payload); }
    catch(e1){ return await post('https://homerates-chat.vercel.app/api/chat', payload); }
  }

  // Ping on load
  (async()=>{ try{ await post('/api/ping',{}); set('ready','#39d98a'); } catch(err){ set('ping failed','#ef4444'); render('assistant','Ping failed: '+err.message); } })();

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const text=(input.value||'').trim(); if(!text) return;
    render('user', text); input.value=''; input.disabled=true; send.disabled=true;

    const ghost=document.createElement('div'); ghost.className='msg assistant'; ghost.innerHTML='<div class="who">AI</div><div class="bubble">...thinking</div>'; thread.appendChild(ghost);
    messages.push({ role:'user', content:text });

    try{
      const data = await callAPI({ messages });
      ghost.remove();
      const reply = data?.reply || 'Sorry — I didn’t catch that.';
      render('assistant', reply);
      messages.push({ role:'assistant', content: reply });
      set('ready','#39d98a');
    }catch(err){
      ghost.remove();
      render('assistant','Error contacting API: '+err.message);
      set('api error','#ef4444');
    }finally{
      input.disabled=false; send.disabled=false; input.focus();
    }
  });
});