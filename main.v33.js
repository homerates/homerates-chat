// main.v33.js (CANARY) 20251007-204201
(function(){
  console.log('LIVE main.v33.js 20251007-204201');
  function ensure(id, style){
    var el = document.getElementById(id);
    if(!el){ el=document.createElement('div'); el.id=id; if(style) el.style=style; document.body.appendChild(el); }
    return el;
  }
  ensure('build','position:fixed;right:10px;bottom:10px;opacity:.6;font:12px system-ui;z-index:9999')
    .textContent = 'main.v33.js 20251007-204201';
})();
