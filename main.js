(function(){
  // Global error -> show on page
  window.addEventListener('error', (e)=>{
    try {
      const pill = document.getElementById('status');
      if (pill) { pill.textContent = 'js error'; pill.style.color = '#ef4444'; }
      const out = document.getElementById('thread');
      if (out) {
        const div = document.createElement('div');
        div.className = 'msg assistant';
        div.innerHTML = '<div class="who">AI</div><div class="bubble">JS error: '+String(e?.error?.message||e?.message||e)+' </div>';
        out.appendChild(div);
      }
    } catch(_) {}
  });

  document.addEventListener('DOMContentLoaded', ()=> {
    const \ = document.getElementById('thread');
    const \   = document.getElementById('composer');
    const \  = document.getElementById('input');
    const \   = document.getElementById('send');
    const \ = document.getElementById('status');

    const RELATIVE_API = '/api/chat';
    const ABSOLUTE_API = 'https://homerates-chat.vercel.app/api/chat'; // fallback

    const messages = [
      { role:'system',
        content:'You are GPT-5 Thinking, a CA mortgage guide for HomeRates.ai. Educational only; not a commitment to lend. State assumptions. Tailor to CA rules for Access Zero, DSCR, Jumbo Advantage, FHA/VA. No emojis.' }
    ];

    function setStatus(txt, color){ if(\){ \.textContent = txt; \.style.color = color||'#a6a6ad'; } }
    function esc(s){ return (s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
    function render(role,text){
      if (!\) return;
      const div=document.createElement('div');
      div.className=\msg \\;
      div.innerHTML=\<div class="who">\</div><div class="bubble">\</div>\;
      \.appendChild(div);
      \.scrollTop=\.scrollHeight;
    }
    async function post(url, body){
      const r = await fetch(url,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const raw = await r.text(); let j={}; try{ j = JSON.parse(raw) }catch{}
      if(!r.ok) throw new Error(j?.detail || j?.error || raw || ('HTTP '+r.status));
      return j;
    }
    async function callAPI(payload){
      try { return await post(RELATIVE_API, payload); }
      catch(e1){
        try { return await post(ABSOLUTE_API, payload); }
        catch(e2){ throw new Error(e1.message + ' | fallback: ' + e2.message); }
      }
    }
    function busy(b){ if(\) \.disabled=b; if(\) \.disabled=b; }

    // Seed intro and mark JS loaded
    render('assistant','Welcome. Share price, down payment, and credit score for a quick ballpark and best-structure notes (seller credit vs price cut, Access Zero, points).\\n\\nNote: Educational only; CA rules.');
    setStatus('booting...', '#a6a6ad');

    // Prove API works right on load
    (async ()=>{
      try{
        const ping = await post('/api/ping', {});
        setStatus('ready', '#39d98a');
        render('assistant', 'Ping ok (server online).');
      }catch(err){
        setStatus('ping failed', '#ef4444');
        render('assistant','Ping failed: '+err.message);
      }
    })();

    // Submit handler (guard if form missing)
    if (\) {
      \.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const text=(\.value||'').trim(); if(!text) return;

        render('user', text);
        if (\) \.value='';
        busy(true);

        const ghost=document.createElement('div');
        ghost.className='msg assistant';
        ghost.innerHTML='<div class="who">AI</div><div class="bubble">...thinking</div>';
        \.appendChild(ghost);

        messages.push({ role:'user', content:text });

        try{
          const data = await callAPI({ messages });
          ghost.remove();
          const reply = data?.reply || 'Sorry — I didn’t catch that.';
          render('assistant', reply);
          messages.push({ role:'assistant', content: reply });
          setStatus('ready', '#39d98a');
        }catch(err){
          ghost.remove();
          render('assistant','Error contacting API: '+err.message);
          setStatus('api error', '#ef4444');
        }finally{
          busy(false); \.focus();
        }
      });
    } else {
      render('assistant','Form not found in DOM.');
      setStatus('form missing', '#ef4444');
    }
  });
})();