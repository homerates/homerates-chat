/* main.v33.js — production build 20251007-211413 */
(function () {
  console.log('✅ HomeRates.ai main.v33.js live 20251007-211413');

  function el(id){ return document.getElementById(id); }

  // show visible badge so we can confirm it's live
  (function ensureBadge(){
    var b = el('build');
    if(!b){
      b = document.createElement('div');
      b.id = 'build';
      b.style = 'position:fixed;right:10px;bottom:10px;opacity:.6;font:12px system-ui;z-index:9999';
      document.body.appendChild(b);
    }
    b.textContent = 'HomeRates.ai v33 (20251007-211413)';
  })();

  function boot(){
    var thread = el('thread');
    if (thread) {
      thread.innerHTML = '<div class="msg">Welcome to <b>HomeRates.ai</b> v33 — the chat is live.</div>';
    }
    // simple sidebar interactivity so we can see changes immediately
    var map = {
      newChatBtn:  'Started new chat.',
      saveChatBtn: 'Chat saved.',
      newProjectBtn: 'New project created.'
    };
    Object.entries(map).forEach(function([id,msg]){
      var btn = el(id);
      if (btn) btn.onclick = function(){ alert(msg); };
    });
  }

  if (document.readyState === 'complete') boot();
  else window.addEventListener('DOMContentLoaded', boot);
})();
