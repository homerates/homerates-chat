document.addEventListener('DOMContentLoaded', ()=>{
  console.log('>>> main.js booted v4');
  const status = document.getElementById('status');
  if (status) { status.textContent = 'js boot ok'; status.style.color = '#39d98a'; }

  const thread = document.getElementById('thread');
  function render(role,text){
    const div=document.createElement('div');
    div.className=\msg \\;
    div.innerHTML=\<div class="who">\</div><div class="bubble">\</div>\;
    thread.appendChild(div);
    thread.scrollTop=thread.scrollHeight;
  }

  render('assistant','Script loaded, waiting for ping…');

  // ping
  fetch('/api/ping',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})
    .then(r=>r.text())
    .then(txt=>{
      status.textContent='ping ok'; status.style.color='#39d98a';
      render('assistant','Ping response: '+txt);
    })
    .catch(err=>{
      status.textContent='ping failed'; status.style.color='#ef4444';
      render('assistant','Ping error: '+err.message);
    });
});