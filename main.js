(() => {
  // ---- storage & state ----
  const LS = {
    get(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch{ return d; } },
    set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
  };
  const uid = () => Math.random().toString(36).slice(2,10);
  const now = () => new Date().toISOString();

  const state = {
    projects: LS.get('hr_projects', []),
    chats:     LS.get('hr_chats', {}),
    currentId: LS.get('hr_current', null)
  };
  if (state.projects.length === 0) {
    state.projects.push({ id: uid(), name: 'General' });
    LS.set('hr_projects', state.projects);
  }

  // ---- DOM ----
  const    = document.getElementById('thread');
  const    = document.getElementById('status');
  const     = document.getElementById('chats');
  const  = document.getElementById('projects');
  const   = document.getElementById('archive');
  const   = document.getElementById('newChat');
  const   = document.getElementById('archiveChat');
  const      = document.getElementById('composer');
  const     = document.getElementById('input');
  const  = document.getElementById('projectName');
  const   = document.getElementById('addProject');

  const API_CHAT = '/api/chat';

  // ---- simple renderer: strip markdown-y tokens, keep bullets/paras ----
  const esc = s => String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  function tidy(text){
    // normalize newlines
    let s = String(text||'').replace(/\r\n/g,'\n').trim();

    // remove code fences
    s = s.replace(/`[\s\S]*?`/g, m => m.replace(/`/g,''));

    // convert headings into plain bold lines
    s = s.replace(/^\s*#{1,6}\s*(.+)$/gm, (_,t)=>('<strong>'+esc(t.trim())+'</strong>'));

    // replace **bold** with <strong> and *em* with <em>
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong></strong>');
    s = s.replace(/\*(.+?)\*/g, '<em></em>');

    // bullets: keep lines starting with '-' or '•'
    s = s.replace(/^[\-\u2022]\s+/gm, '• ');

    // collapse triple+ newlines to double
    s = s.replace(/\n{3,}/g, '\n\n');

    // split paragraphs, keep bullets within <ul>
    const parts = s.split(/\n{2,}/);
    const html = parts.map(block => {
      const lines = block.split('\n');
      const lis = lines.filter(l => /^\s*•\s+/.test(l)).map(l => '<li>'+esc(l.replace(/^\s*•\s+/,''))+'</li>').join('');
      if (lis) return '<ul>'+lis+'</ul>';
      return '<p>'+esc(block).replace(/\n/g,'<br/>')+'</p>';
    }).join('');
    return html;
  }

  function setStatus(text, color){ if(){ .textContent=text; .style.color=color||'#a6a6ad'; } }
  function render(role, html){
    const el = document.createElement('div');
    el.className = 'msg '+role;
    el.innerHTML = '<div class="who">'+(role==='user'?'U':'AI')+'</div><div class="bubble">'+html+'</div>';
    .appendChild(el);
    .scrollTop = .scrollHeight;
  }

  function persist(){ LS.set('hr_projects', state.projects); LS.set('hr_chats', state.chats); LS.set('hr_current', state.currentId); drawLists(); }
  function currentChat(){
    if (state.currentId && state.chats[state.currentId]) return state.chats[state.currentId];
    const pid = state.projects[0]?.id; const id = uid();
    const chat = { id, title:'New Chat', projectId:pid, archived:false, messages:[], updatedAt: now() };
    state.chats[id] = chat; state.currentId=id; persist(); return chat;
  }

  function drawLists(){
    // projects
    .innerHTML = '';
    for(const p of state.projects){
      const div = document.createElement('div'); div.className='item'; div.textContent=p.name;
      div.onclick = ()=> drawChats(p.id);
      .appendChild(div);
    }
    drawChats(); drawArchive();
  }
  function drawChats(filter=null){
    .innerHTML=''; const entries = Object.values(state.chats)
      .filter(c=>!c.archived && (!filter || c.projectId===filter))
      .sort((a,b)=> (b.updatedAt||'').localeCompare(a.updatedAt||''));
    for(const c of entries){
      const div = document.createElement('div'); div.className='item'+(c.id===state.currentId?' active':'');
      div.innerHTML = esc(c.title) + (c.updatedAt? '<small>'+c.updatedAt.slice(0,16).replace('T',' ')+'</small>':'');
      div.onclick = ()=>{ state.currentId=c.id; persist(); loadChat(); };
      .appendChild(div);
    }
  }
  function drawArchive(){
    .innerHTML=''; const entries = Object.values(state.chats).filter(c=>c.archived)
      .sort((a,b)=> (b.updatedAt||'').localeCompare(a.updatedAt||''));
    for(const c of entries){
      const div = document.createElement('div'); div.className='item'; div.textContent=c.title;
      div.onclick = ()=>{ c.archived=false; state.currentId=c.id; persist(); loadChat(); };
      .appendChild(div);
    }
  }

  function loadChat(){
    .innerHTML=''; const chat=currentChat();
    if (!chat.messages.length){
      render('assistant', tidy('Welcome. Share price, down payment, and credit score for a quick ballpark and best-structure notes (seller credit vs price cut, Access Zero, points).\n\nEducational only; CA rules.'));
    } else {
      for(const m of chat.messages){ render(m.role==='user'?'user':'assistant', m.html ?? tidy(m.content)); }
    }
    setStatus('ready','#39d98a');
  }

  async function post(url, body){
    const r = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const raw = await r.text(); let j={}; try{ j=JSON.parse(raw) }catch{}
    if(!r.ok) throw new Error(j?.detail || j?.error || raw || ('HTTP '+r.status)); return j;
  }

  async function sendMessage(text){
    const chat = currentChat();
    const user = { role:'user', content:text, html: tidy(text) };
    chat.messages.push(user); chat.updatedAt=now(); chat.title = text.slice(0,48) || 'New Chat'; persist();
    render('user', user.html);

    const ghost=document.createElement('div'); ghost.className='msg assistant'; ghost.innerHTML='<div class="who">AI</div><div class="bubble">…thinking</div>'; .appendChild(ghost); .scrollTop=.scrollHeight;

    try{
      const payload = { messages: [{ role:'system', content:'You are GPT-5 Thinking for HomeRates.ai. No markdown; use short paragraphs and plain bullet lines starting with \"-\". California mortgage guidance only.' }, ...chat.messages.map(({role,content})=>({role,content}))] };
      const data = await post(API_CHAT, payload);
      ghost.remove();
      const reply = (data?.reply||'').trim();
      const bot = { role:'assistant', content:reply, html: tidy(reply) };
      chat.messages.push(bot); chat.updatedAt=now(); persist(); render('assistant', bot.html); setStatus('ready','#39d98a');
    }catch(err){
      ghost.remove(); render('assistant', tidy('Error contacting API: '+err.message)); setStatus('api error','#ef4444');
    }
  }

  // events
  (async()=>{ try{ await post('/api/ping',{}); setStatus('ready','#39d98a'); }catch{ setStatus('ping failed','#ef4444'); }})();
  .addEventListener('submit', (e)=>{ e.preventDefault(); const t=(.value||'').trim(); if(!t) return; .value=''; sendMessage(t); });
  .addEventListener('keydown', (e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); .requestSubmit(); }});
  .onclick = ()=>{ const pid=state.projects[0]?.id; const id=uid(); state.chats[id]={id,title:'New Chat',projectId:pid,archived:false,messages:[],updatedAt:now()}; state.currentId=id; persist(); loadChat(); };
  .onclick = ()=>{ const c=currentChat(); c.archived=true; persist(); loadChat(); };
  .onclick = ()=>{ const name=(.value||'').trim(); if(!name) return; state.projects.push({id:uid(),name}); .value=''; persist(); };

  drawLists(); loadChat();
})();