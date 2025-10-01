(async () => {
  const status = document.getElementById('status');
  const out = document.getElementById('out');
  const log = (o)=> out.textContent += (out.textContent?'\n':'') + JSON.stringify(o,null,2);
  try { const r = await fetch('/api/ping',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}); log({ping:r.status, ok:r.ok, text:await r.text()}); } catch(e){ log({pingErr:String(e)}) }
  try { const r = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}); log({chat:r.status, ok:r.ok, text:await r.text()}); status.textContent = r.ok?'ready':'error'; } catch(e){ log({chatErr:String(e)}); status.textContent='error'; }
})();