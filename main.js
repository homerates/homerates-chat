document.addEventListener('DOMContentLoaded', ()=>{
  const status = document.getElementById('status') || (()=>{const s=document.createElement('div');s.id='status';s.style='position:fixed;top:8px;right:8px;background:#222;padding:4px 8px;border:1px solid #444;border-radius:6px;font:12px system-ui;color:#ddd;z-index:9999';document.body.appendChild(s);return s;})();
  const thread = document.getElementById('thread') || (()=>{const d=document.createElement('div');d.id='thread';d.style='min-height:40vh;margin:60px 12px 12px;background:#111;border:1px solid #333;color:#eee;padding:10px;border-radius:8px;font:14px system-ui;';document.body.appendChild(d);return d;})();
  const form = document.getElementById('composer');
  const input = document.getElementById('input');

  const log = (t)=>{ const p=document.createElement('div'); p.textContent=t; thread.appendChild(p); thread.scrollTop=thread.scrollHeight; };
  const set = (t,c)=>{ status.textContent=t; status.style.color=c||'#a6a6ad'; };

  // Catch any JS errors
  window.addEventListener('error', e => { set('js error','#ef4444'); log('JS error: '+(e?.error?.message||e?.message||String(e))); });

  set('boot','#39d98a'); log('boot: main.js v11 loaded');

  // Ping on load
  (async ()=>{
    try{
      const r = await fetch('/api/ping',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      const txt = await r.text();
      log('ping: '+txt);
      set('ready','#39d98a');
    }catch(err){
      set('ping failed','#ef4444'); log('ping failed: '+err.message);
    }
  })();

  // Wire submit (or add a quick form if missing)
  if(!form){
    const f=document.createElement('form'); f.id='composer'; f.style='position:fixed;left:12px;right:12px;bottom:12px;display:flex;gap:8px';
    const ta=document.createElement('textarea'); ta.id='input'; ta.placeholder='Type ping and press Send'; ta.style='flex:1;height:48px;background:#111;color:#eee;border:1px solid #333;border-radius:8px;padding:8px';
    const btn=document.createElement('button'); btn.type='submit'; btn.textContent='Send'; btn.style='min-width:90px;border-radius:8px;border:1px solid #333;background:#1b1b22;color:#fff';
    f.appendChild(ta); f.appendChild(btn); document.body.appendChild(f);
  }

  (document.getElementById('composer')).addEventListener('submit', async (e)=>{
    e.preventDefault();
    const value = (document.getElementById('input').value||'').trim(); if(!value) return;
    document.getElementById('input').value='';
    log('you: '+value);
    try{
      const r = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:value}]})});
      const txt = await r.text();
      log('chat: '+txt);
      set('ready','#39d98a');
    }catch(err){
      set('api error','#ef4444'); log('chat failed: '+err.message);
    }
  });
});