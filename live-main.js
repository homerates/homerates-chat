(() => {
  // ===== Utilities & Storage =====
  const LS = {
    get(k, d){ try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
  };
  const uid = () => Math.random().toString(36).slice(2,10);
  const now = () => new Date().toISOString();
  const API_BASE = ''; // relative (works on vercel.app & custom domain). For localhost dev you can set to 'https://homerates-chat.vercel.app'

  // ===== State =====
  const state = {
    projects: LS.get('hr_projects', []),           // [{id,name}]
    chats:    LS.get('hr_chats', {}),              // { id:{id,title,projectId,archived,messages:[{role,content,html}],updatedAt} }
    current:  LS.get('hr_current', null)           // chat id
  };
  if (!state.projects.length) {
    state.projects.push({ id: uid(), name: 'General' });
  }

  // ===== DOM =====
  const    = document.getElementById('status');
  const    = document.getElementById('thread');
  const     = document.getElementById('chats');
  const  = document.getElementById('projects');
  const   = document.getElementById('archive');
  const      = document.getElementById('composer');
  const     = document.getElementById('query');
  const   = document.getElementById('newChat');
  const   = document.getElementById('addProject');
  const  = document.getElementById('projectName');

  // ===== Tidy renderer (no ** or ###; paragraphs + bullets) =====
  const esc = s => String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  function tidy(text){
    let s = String(text||'').replace(/\r\n/g,'\n').trim();
    // strip ` fences but keep content
    s = s.replace(/`[\s\S]*?`/g, m => m.replace(/`/g,''));
    // headings -> strong
    s = s.replace(/^\s*#{1,6}\s*(.+)$/gm, (_m,t)=>'<strong>'+esc(t.trim())+'</strong>');
    // **bold** and *em*
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong></strong>').replace(/\*(.+?)\*/g, '<em></em>');
    // normalize bullets
    s = s.replace(/^[\-\u2022]\s+/gm, '• ');
    // collapse blank lines
    s = s.replace(/\n{3,}/g, '\n\n');
    // blockify
    const parts = s.split(/\n{2,}/);
    return parts.map(block=>{
      const lines = block.split('\n');
      const lis = lines.filter(l=>/^\s*•\s+/.test(l)).map(l=>'<li>'+esc(l.replace(/^\s*•\s+/,''))+'</li>').join('');
      if (lis) return '<ul>'+lis+'</ul>';
      return '<p>'+esc(block).replace(/\n/g,'<br/>')+'</p>';
    }).join('');
  }

  function setStatus(t,c){ if(){ .textContent=t; .style.color=c||'#a6a6ad'; } }
  function render(role, html){
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.innerHTML = '<div class="msg '+role+'"><div class="who">'+(role==='user'?'U':'AI')+'</div><div class="bubble">'+html+'</div></div>';
    .appendChild(wrap);
    .scrollTop = .scrollHeight;
  }

  function persist(){
    LS.set('hr_projects', state.projects);
    LS.set('hr_chats', state.chats);
    LS.set('hr_current', state.current);
    drawLists();
  }

  function currentChat(){
    if (state.current && state.chats[state.current]) return state.chats[state.current];
    // create new
    const pid = state.projects[0]?.id;
    const id  = uid();
    const chat = { id, title:'New Chat', projectId:pid, archived:false, messages:[], updatedAt: now() };
    state.chats[id] = chat;
    state.current = id;
    persist();
    return chat;
  }

  function drawLists(){
    // projects
    .innerHTML = '';
    for(const p of state.projects){
      const div=document.createElement('div');
      div.className='item';
      div.textContent=p.name;
      div.onclick = ()=> drawChats(p.id);
      .appendChild(div);
    }
    drawChats(); drawArchive();
  }
  function drawChats(filter=null){
    .innerHTML = '';
    const arr = Object.values(state.chats)
      .filter(c=>!c.archived && (!filter || c.projectId===filter))
      .sort((a,b)=> (b.updatedAt||'').localeCompare(a.updatedAt||''));
    for(const c of arr){
      const div=document.createElement('div');
      div.className='item'+(c.id===state.current?' active':'');
      div.innerHTML = esc(c.title)+(c.updatedAt?'<small>'+c.updatedAt.slice(0,16).replace('T',' ')+'</small>':'');
      div.onclick = ()=>{ state.current=c.id; persist(); loadChat(); };
      .appendChild(div);
    }
  }
  function drawArchive(){
    .innerHTML = '';
    const arr = Object.values(state.chats).filter(c=>c.archived)
      .sort((a,b)=> (b.updatedAt||'').localeCompare(a.updatedAt||''));
    for(const c of arr){
      const div=document.createElement('div');
      div.className='item';
      div.textContent = c.title;
      div.onclick = ()=>{ c.archived=false; state.current=c.id; persist(); loadChat(); };
      .appendChild(div);
    }
  }

  function loadChat(){
    .querySelectorAll('.card:not(:first-child)').forEach(n=>n.remove()); // keep the welcome card
    const chat = currentChat();
    for (const m of chat.messages){
      render(m.role, m.html ?? tidy(m.content));
    }
    setStatus('ready', '#39d98a');
  }

  // ===== Networking =====
  async function post(path, body){
    const r = await fetch(API_BASE + path, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const raw = await r.text(); let j={}; try{ j = JSON.parse(raw) }catch{}
    if(!r.ok) throw new Error(j?.detail || j?.error || raw || ('HTTP '+r.status));
    return j;
  }

  async function send(text){
    const chat = currentChat();
    const user = { role:'user', content:text, html: tidy(text) };
    chat.messages.push(user); chat.updatedAt = now(); chat.title = text.slice(0,48)||'New Chat'; persist();
    render('user', user.html);

    const ghost = document.createElement('div');
    ghost.className='card';
    ghost.innerHTML = '<div class="msg assistant"><div class="who">AI</div><div class="bubble">…thinking</div></div>';
    .appendChild(ghost); .scrollTop = .scrollHeight;

    try{
      const payload = {
        messages: [
          { role:'system', content: [
              "You are GPT-5 Thinking for HomeRates.ai. California mortgage guidance only.",
              "No markdown symbols. Do not output **, ##, or code fences.",
              "Write in short paragraphs and plain bullet lines that begin with '-'.",
              "When math is needed, show the steps clearly and keep numbers readable."
            ].join(' ')
          },
          ...chat.messages.map(({role,content})=>({role,content}))
        ]
      };
      const data = await post('/api/chat', payload);
      ghost.remove();
      const reply = (data?.reply||'').trim();
      const bot = { role:'assistant', content:reply, html: tidy(reply) };
      chat.messages.push(bot); chat.updatedAt = now(); persist();
      render('assistant', bot.html);
      setStatus('ready', '#39d98a');
    } catch (err){
      ghost.remove();
      render('assistant', tidy('Error contacting API: '+String(err.message||err)));
      setStatus('api error', '#ef4444');
    }
  }

  // ===== Events =====
  .addEventListener('submit', (e)=>{
    e.preventDefault();
    const val = (.value||'').trim();
    if(!val) return;
    .value='';
    send(val);
  });
  .addEventListener('keydown', (e)=>{ if(e.key==='Enter' && e.shiftKey){ /* allow newline in future */ } });

  .onclick = ()=>{
    const pid = state.projects[0]?.id;
    const id = uid();
    state.chats[id] = { id, title:'New Chat', projectId:pid, archived:false, messages:[], updatedAt:now() };
    state.current = id; persist(); loadChat();
  };
  .onclick = ()=>{
    const name = (.value||'').trim(); if(!name) return;
    state.projects.push({ id: uid(), name }); .value=''; persist();
  };

  // ===== Boot =====
  drawLists(); loadChat();
  // warm-up ping (via chat) to set status
  (async()=>{ try{
    await post('/api/chat', { messages:[{role:'user',content:'ping'}] });
    setStatus('ready','#39d98a');
  }catch{ setStatus('api error','#ef4444'); } })();
})();;(() => {
  // Status pill if missing
  const status = document.getElementById('status') || (()=>{const s=document.createElement('span');s.id='status';s.style.cssText='position:fixed;top:8px;right:8px;background:#222;padding:4px 8px;border:1px solid #444;border-radius:6px;font:12px system-ui;color:#ddd;z-index:9999';document.body.appendChild(s);return s;})();
  const set = (t,c)=>{ status.textContent=t; status.style.color=c||'#a6a6ad'; };

  // Ensure composer exists and is wired
  let form = document.getElementById('composer');
  let input = document.getElementById('query') || document.getElementById('input');
  if (!form) {
    form = document.createElement('form'); form.id='composer'; form.style.cssText='position:fixed;left:12px;right:12px;bottom:12px;display:flex;gap:8px';
    input = document.createElement('input'); input.id='query'; input.placeholder='Type and Enter to send'; input.style.cssText='flex:1;height:44px';
    const btn=document.createElement('button'); btn.type='submit'; btn.textContent='Send';
    form.appendChild(input); form.appendChild(btn); document.body.appendChild(form);
  }
  if (!input) { input = document.createElement('input'); input.id='query'; form.prepend(input); }

  const thread = document.getElementById('thread') || (()=>{const d=document.createElement('div');d.id='thread';d.style.cssText='min-height:40vh;margin:60px 12px;background:#111;border:1px solid #333;color:#eee;padding:10px;border-radius:8px;font:14px system-ui';document.body.appendChild(d);return d;})();
  const log = t => { const p=document.createElement('div'); p.textContent=String(t); thread.appendChild(p); thread.scrollTop=thread.scrollHeight; };

  // Global error logger
  window.addEventListener('error', e => { set('js error','#ef4444'); log('JS error: '+(e?.error?.message||e?.message||String(e))); });

  // Prove JS loaded
  log('boot: diag client loaded');

  // Test ping from the page
  (async()=>{ try{
    const r = await fetch('/api/ping', {method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    log('ping: '+await r.text()); set('ready','#39d98a');
  } catch(err){ log('ping failed: '+err.message); set('ping failed','#ef4444'); }})();

  // Guaranteed submit handler that posts to /api/chat and prints raw result
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const text = (input.value||'').trim(); if(!text) return;
    input.value=''; log('you: '+text);
    try{
      const r = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:text}]})});
      const body = await r.text();
      log('chat: '+body);
      set(r.ok ? 'ready':'api error', r.ok ? '#39d98a' : '#ef4444');
    }catch(err){
      log('chat failed: '+err.message); set('api error','#ef4444');
    }
  });
})();
;(() => {
  // Status pill if missing
  const status = document.getElementById('status') || (()=>{const s=document.createElement('span');s.id='status';s.style.cssText='position:fixed;top:8px;right:8px;background:#222;padding:4px 8px;border:1px solid #444;border-radius:6px;font:12px system-ui;color:#ddd;z-index:9999';document.body.appendChild(s);return s;})();
  const set = (t,c)=>{ status.textContent=t; status.style.color=c||'#a6a6ad'; };

  // Ensure composer exists and is wired
  let form = document.getElementById('composer');
  let input = document.getElementById('query') || document.getElementById('input');
  if (!form) {
    form = document.createElement('form'); form.id='composer'; form.style.cssText='position:fixed;left:12px;right:12px;bottom:12px;display:flex;gap:8px';
    input = document.createElement('input'); input.id='query'; input.placeholder='Type and Enter to send'; input.style.cssText='flex:1;height:44px';
    const btn=document.createElement('button'); btn.type='submit'; btn.textContent='Send';
    form.appendChild(input); form.appendChild(btn); document.body.appendChild(form);
  }
  if (!input) { input = document.createElement('input'); input.id='query'; form.prepend(input); }

  const thread = document.getElementById('thread') || (()=>{const d=document.createElement('div');d.id='thread';d.style.cssText='min-height:40vh;margin:60px 12px;background:#111;border:1px solid #333;color:#eee;padding:10px;border-radius:8px;font:14px system-ui';document.body.appendChild(d);return d;})();
  const log = t => { const p=document.createElement('div'); p.textContent=String(t); thread.appendChild(p); thread.scrollTop=thread.scrollHeight; };

  // Global error logger
  window.addEventListener('error', e => { set('js error','#ef4444'); log('JS error: '+(e?.error?.message||e?.message||String(e))); });

  // Prove JS loaded
  log('boot: diag client loaded');

  // Test ping from the page
  (async()=>{ try{
    const r = await fetch('/api/ping', {method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    log('ping: '+await r.text()); set('ready','#39d98a');
  } catch(err){ log('ping failed: '+err.message); set('ping failed','#ef4444'); }})();

  // Guaranteed submit handler that posts to /api/chat and prints raw result
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const text = (input.value||'').trim(); if(!text) return;
    input.value=''; log('you: '+text);
    try{
      const r = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:text}]})});
      const body = await r.text();
      log('chat: '+body);
      set(r.ok ? 'ready':'api error', r.ok ? '#39d98a' : '#ef4444');
    }catch(err){
      log('chat failed: '+err.message); set('api error','#ef4444');
    }
  });
})();
;(() => {
  function wireComposer() {
    const form   = document.getElementById('composer');
    const input  = document.getElementById('query') || document.getElementById('input');
    const thread = document.getElementById('thread');
    if (!form || !input || !thread) {
      console.error('Missing element(s):', { form: !!form, input: !!input, thread: !!thread });
      return;
    }

    // Helper to add lines to thread
    const add = (txt, color) => {
      const d = document.createElement('div');
      d.textContent = String(txt);
      d.style.whiteSpace = 'pre-wrap';
      if (color) d.style.color = color;
      thread.appendChild(d);
      thread.scrollTop = thread.scrollHeight;
    };

    // Remove any previous handler
    if (form.__hr_wired) {
      form.removeEventListener('submit', form.__hr_wired);
    }

    // New submit handler
    const onSubmit = async (e) => {
      e.preventDefault();
      const text = (input.value || '').trim();
      if (!text) return;
      input.value = '';
      add('you: ' + text);

      try {
        const r = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages:[{role:'user', content:text}] })
        });
        const body = await r.text();
        add('chat: ' + body);
      } catch (err) {
        add('chat failed: ' + (err?.message || err), '#ef4444');
      }
    };

    form.addEventListener('submit', onSubmit);
    form.__hr_wired = onSubmit;
    console.log('Composer wired');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireComposer);
  } else {
    wireComposer();
  }
})();
;(() => {
  // --- tiny tidy: paragraphs + bullets; strip ** / ### ---
  const esc = s => String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  function tidy(text){
    let s = String(text||'').replace(/\r\n/g,'\n').trim();
    s = s.replace(/`[\s\S]*?`/g, m => m.replace(/`/g,'')); // remove fences
    s = s.replace(/^\s*#{1,6}\s*(.+)$/gm, (_m,t)=>'<strong>'+esc(t.trim())+'</strong>');
    s = s.replace(/\*\*(.+?)\*\*/g,'<strong></strong>').replace(/\*(.+?)\*/g,'<em></em>');
    s = s.replace(/^[\-\u2022]\s+/gm, '• ');
    s = s.replace(/\n{3,}/g,'\n\n');
    return s.split(/\n{2,}/).map(block=>{
      const lines = block.split('\n');
      const lis = lines.filter(l=>/^\s*•\s+/.test(l)).map(l=>'<li>'+esc(l.replace(/^\s*•\s+/,''))+'</li>').join('');
      if (lis) return '<ul>'+lis+'</ul>';
      return '<p>'+esc(block).replace(/\n/g,'<br/>')+'</p>';
    }).join('');
  }

  function wire() {
    const form   = document.getElementById('composer');
    const input  = document.getElementById('query') || document.getElementById('input');
    const thread = document.getElementById('thread');
    const sendBtn= document.getElementById('send');

    if (!form || !input || !thread) { console.warn('wire: missing elements', {form:!!form,input:!!input,thread:!!thread}); return; }

    // helper to add a styled row that matches your DOM structure
    function add(role, html){
      const wrap = document.createElement('div');
      wrap.className = 'card';
      wrap.innerHTML = '<div class="msg '+role+'"><div class="who">'+(role==='user'?'U':'AI')+'</div><div class="bubble">'+html+'</div></div>';
      thread.appendChild(wrap);
      thread.scrollTop = thread.scrollHeight;
    }

    // avoid double-binding
    if (form.__hr_wired) { form.removeEventListener('submit', form.__hr_wired); }
    if (input.__hr_key)  { input.removeEventListener('keydown', input.__hr_key); }

    const onSubmit = async (e)=>{
      e.preventDefault();
      const text = (input.value||'').trim();
      if (!text) return;
      input.value = '';
      add('user', tidy(text));

      // typing ghost
      const ghost = document.createElement('div');
      ghost.className='card';
      ghost.innerHTML = '<div class="msg assistant"><div class="who">AI</div><div class="bubble">…thinking</div></div>';
      thread.appendChild(ghost); thread.scrollTop = thread.scrollHeight;

      try{
        const r = await fetch('/api/chat',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({messages:[{role:'user',content:text}]})
        });
        const raw  = await r.text();
        let reply=''; try { reply = (JSON.parse(raw)?.reply||'').trim(); } catch { reply = raw; }
        ghost.remove();
        add('assistant', tidy(reply||raw));
      }catch(err){
        ghost.remove();
        add('assistant', '<p style="color:#ef4444">Error contacting API: '+esc(err.message||String(err))+'</p>');
      }
    };

    form.addEventListener('submit', onSubmit);
    form.__hr_wired = onSubmit;

    // Enter to send (preserve Shift+Enter for future multiline)
    const onKey = (e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); form.requestSubmit(); } };
    input.addEventListener('keydown', onKey);
    input.__hr_key = onKey;

    // If there is a send button, ensure it triggers submit
    if (sendBtn && !sendBtn.__hr_click) {
      sendBtn.addEventListener('click', (e)=>{ e.preventDefault(); form.requestSubmit(); });
      sendBtn.__hr_click = true;
    }

    console.log('hr: composer wired');
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', wire); } else { wire(); }
})();

