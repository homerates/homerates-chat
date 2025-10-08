// CANARY main.js 20251007-203007
(function(){
  console.log('CANARY main.js LIVE 20251007-203007');
  function ensure(id, style){
    var el = document.getElementById(id);
    if(!el){ el = document.createElement('div'); el.id=id; if(style) el.style=style; document.body.appendChild(el); }
    return el;
  }
  var badge = ensure('build', 'position:fixed;right:10px;bottom:10px;opacity:.6;font:12px system-ui;z-index:9999');
  badge.textContent = 'CANARY main.js 20251007-203007';
})();
