// hr.bundle.js — deployed 20251007-215611
(function(){
  console.log('✅ LIVE hr.bundle.js 20251007-215611');
  function ensure(id, style){
    var el = document.getElementById(id);
    if(!el){ el=document.createElement('div'); el.id=id; if(style) el.style=style; document.body.appendChild(el); }
    return el;
  }
  ensure('build','position:fixed;right:10px;bottom:10px;opacity:.6;font:12px system-ui;z-index:9999')
    .textContent = 'hr.bundle.js 20251007-215611';

  // Minimal safe boot (no null errors)
  function el(id){ return document.getElementById(id); }
  function boot(){
    var t = el('thread');
    if (t && !t.__hrDemo) {
      t.__hrDemo = true;
      var d = document.createElement('div');
      d.className = 'msg';
      d.textContent = 'HomeRates.ai bundle is alive: ' + 'hr.bundle.js 20251007-215611';
      t.appendChild(d);
    }
  }
  if (document.readyState === 'complete') boot();
  else window.addEventListener('DOMContentLoaded', boot);
})();
