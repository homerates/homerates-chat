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
})();