(() => {
  // ------- tiny store (projects, chats) in localStorage -------
  const LS = {
    get(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch{ return d; } },
    set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
  };
  const uid = () => Math.random().toString(36).slice(2,10);
  const now = () => new Date().toISOString();

  const state = {
    projects: LS.get('hr_projects', []),              // [{id,name}]
    chats:     LS.get('hr_chats', {}),                // { chatId: {id,title,projectId,archived,messages:[]}}
    currentId: LS.get('hr_current', null)
  };

  // bootstrap default project
  if (state.projects.length === 0) {
    const p = { id: uid(), name: 'General' };
    state.projects.push(p);
    LS.set('hr_projects', state.projects);
  }

  const \   = document.getElementById('thread');
  const \   = document.getElementById('status');
  const \    = document.getElementById('chats');
  const \ = document.getElementById('projects');
  const \  = document.getElementById('archive');
  const \  = document.getElementById('newChat');
  const \  = document.getElementById('archiveChat');
  const \     = document.getElementById('composer');
  const \    = document.getElementById('input');
  const \ = document.getElementById('projectName');
  const \  = document.getElementById('addProject');

  const API_CHAT = '/api/chat'; // relative, safe for both domains

  // ------- markdown -> simple HTML (no ** / ### in output) -------
  function md(html){
    let s = String(html || '');
    // code fences (just show as pre)
    s = s.replace(/`([^]+)`/gs, (m, code)=>'<pre>'+escapeHtml(code.trim())+'</pre>');
    // headings to bold lines
    s = s.replace(/^#{1,6}\s?(.+)$/gm, (_m, t)=>'<strong>'+escapeHtml(t.trim())+'</strong>');
    // bold/italic
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong></strong>');
    s = s.replace(/\*(.+?)\*/g, '<em></em>');
    // lists
    s = s.replace(/^(?:-|\*)\s+(.+)$/gm, '<li></li>');
    s = s.replace(/(<li>.*<\/li>)(?!\s*<\/ul>)/gs, '<ul></ul>');
    // links (basic)
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="" target="_blank" rel="noopener"></a>');
    // newlines
    s = s.replace(/\n{2,}/g,'</p><p>').replace(/\n/g,'<br/>');
    return '<p>'+s+'</p>';
  }
  function escapeHtml(x){ return x.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

  function setStatus(text, color){ if(\){ \.textContent=text; \.style.color=color||'#a6a6ad'; } }
  function render(role, html){
    const el = document.createElement('div');
    el.className = 'msg '+role;
    el.innerHTML = '<div class="who">'+(role==='user'?'U':'AI')+'</div><div class="bubble">'+html+'</div>';
    \.appendChild(el);
    \.scrollTop = \.scrollHeight;
  }

  function currentChat(){
    if (state.currentId && state.chats[state.currentId]) return state.chats[state.currentId];
    // make a new one under first project
    const pid = state.projects[0]?.id;
    const id = uid();
    const chat = { id, title:'New Chat', projectId: pid, archived:false, messages: [] };
    state.chats[id] = chat;
    state.currentId = id;
    persist();
    return chat;
  }

  function persist(){
    LS.set('hr_projects', state.projects);
    LS.set('hr_chats', state.chats);
    LS.set('hr_current', state.currentId);
    drawLists();
  }

  function drawLists(){
    // projects
    \.innerHTML = '';
    for(const p of state.projects){
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = escapeHtml(p.name);
      div.onclick = () => {
        // filter chats list to this project
        drawChats(p.id);
      };
      \.appendChild(div);
    }
    // chats & archive
    drawChats();
    drawArchive();
  }

  function drawChats(filterProjectId=null){
    \.innerHTML = '';
    const entries = Object.values(state.chats)
      .filter(c => !c.archived && (!filterProjectId || c.projectId===filterProjectId))
      .sort((a,b)=> (b.updatedAt||'').localeCompare(a.updatedAt||''));
    for(const c of entries){
      const div = document.createElement('div');
      div.className = 'item'+(c.id===state.currentId?' active':'');
      div.innerHTML = escapeHtml(c.title) + '<small>'+ (c.updatedAt?.slice(0,16).replace('T',' ') || '') +'</small>';
      div.onclick = () => { state.currentId=c.id; persist(); loadChat(); };
      \.appendChild(div);
    }
  }

  function drawArchive(){
    \.innerHTML = '';
    const entries = Object.values(state.chats).filter(c=>c.archived)
      .sort((a,b)=> (b.updatedAt||'').localeCompare(a.updatedAt||''));
    for(const c of entries){
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = escapeHtml(c.title);
      div.onclick = () => { c.archived=false; state.currentId=c.id; persist(); loadChat(); };
      \.appendChild(div);
    }
  }

  function loadChat(){
    \.innerHTML = '';
    const chat = currentChat();
    if (!chat.messages.length){
      render('assistant', md('Welcome. Share **price**, **down payment**, and **credit score** for a quick ballpark and best-structure notes (seller credit vs price cut, Access Zero, points).\\n\\n*Educational only; CA rules.*'));
    } else {
      for(const m of chat.messages){
        render(m.role==='user'?'user':'assistant', m.html ?? md(m.content));
      }
    }
    setStatus('ready','#39d98a');
  }

  async function post(url, body){
    const r = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const raw = await r.text(); let j={}; try{ j=JSON.parse(raw) }catch{}
    if(!r.ok) throw new Error(j?.detail || j?.error || raw || ('HTTP '+r.status));
    return j;
  }

  async function sendMessage(text){
    const chat = currentChat();
    const userMsg = { role:'user', content:text, html: md(escapeHtml(text)) };
    chat.messages.push(userMsg);
    chat.updatedAt = now();
    chat.title = text.slice(0,48) || 'New Chat';
    persist();

    render('user', userMsg.html);

    const ghost = document.createElement('div');
    ghost.className='msg assistant';
    ghost.innerHTML='<div class="who">AI</div><div class="bubble">…thinking</div>';
    \.appendChild(ghost); \.scrollTop=\.scrollHeight;

    try{
      const payload = { messages: [
        { role:'system', content:'You are GPT-5 Thinking, a California mortgage guide for HomeRates.ai. Educational only; not a commitment to lend. State assumptions. Tailor to CA rules for Access Zero, DSCR, Jumbo Advantage, FHA/VA. Avoid markdown formatting; respond in clean bullet paragraphs without ** or ###.' },
        ...chat.messages.map(({role,content})=>({role,content}))
      ]};
      const data = await post(API_CHAT, payload);
      ghost.remove();
      const reply = (data?.reply||'').trim();
      const bot = { role:'assistant', content:reply, html: md(reply) };
      chat.messages.push(bot);
      chat.updatedAt = now();
      persist();
      render('assistant', bot.html);
      setStatus('ready','#39d98a');
    }catch(err){
      ghost.remove();
      render('assistant', md('Error contacting API: '+escapeHtml(err.message)));
      setStatus('api error','#ef4444');
    }
  }

  // ------- events -------
  // initial ping
  (async()=>{ try{ await post('/api/ping',{}); setStatus('ready','#39d98a'); } catch{ setStatus('ping failed','#ef4444'); } })();

  \.addEventListener('submit', (e)=>{
    e.preventDefault();
    const text = (\.value||'').trim();
    if(!text) return;
    \.value='';
    sendMessage(text);
  });

  // Enter submits; Shift+Enter for newline
  \.addEventListener('keydown', (e)=>{
    if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); \.requestSubmit(); }
  });

  \.onclick = ()=>{
    const pid = state.projects[0]?.id;
    const id = uid();
    state.chats[id] = { id, title:'New Chat', projectId: pid, archived:false, messages:[], updatedAt: now() };
    state.currentId = id; persist(); loadChat();
  };

  \.onclick = ()=>{
    const chat = currentChat(); chat.archived = true; persist(); loadChat();
  };

  \.onclick = ()=>{
    const name = (\.value||'').trim(); if(!name) return;
    const p = { id: uid(), name }; state.projects.push(p); \.value=''; persist();
  };

  // first render
  drawLists(); loadChat();
})();;(() => {
  // Minimal markdown cleaner -> HTML (no **, no ###, keeps bullets & paragraphs)
  function hrTidy(text) {
    let s = String(text || "").replace(/\r\n/g, "\n").trim();

    // strip triple backtick fences but keep their content
    s = s.replace(/`[\s\S]*?`/g, m => m.replace(/`/g, ""));

    // headings -> bold line
    s = s.replace(/^\s*#{1,6}\s*(.+)$/gm, (_m, t) => "<strong>" + escapeHtml(t.trim()) + "</strong>");

    // bold/italic
    s = s.replace(/\*\*(.+?)\*\*/g, "<strong></strong>");
    s = s.replace(/\*(.+?)\*/g, "<em></em>");

    // normalize bullets
    s = s.replace(/^[\-\u2022]\s+/gm, "• ");

    // collapse excessive blank lines
    s = s.replace(/\n{3,}/g, "\n\n");

    // paragraphize, keeping bullet blocks as <ul>
    const parts = s.split(/\n{2,}/);
    const html = parts.map(block => {
      const lines = block.split("\n");
      const lis = lines
        .filter(l => /^\s*•\s+/.test(l))
        .map(l => "<li>" + escapeHtml(l.replace(/^\s*•\s+/, "")) + "</li>")
        .join("");
      if (lis) return "<ul>" + lis + "</ul>";
      return "<p>" + escapeHtml(block).replace(/\n/g, "<br/>") + "</p>";
    }).join("");
    return html;
  }

  function escapeHtml(x) {
    return String(x).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  }

  // Format any .bubble node (only if it looks like plain text, not already HTML)
  function formatBubble(el) {
    if (!el) return;
    // If it already contains tags (e.g., our previous tidy ran), skip
    const hasTags = /<\/?[a-z][\s\S]*>/i.test(el.innerHTML);
    // If it came in as plain text (no tags) or we see raw **/##, reformat
    const needs = !hasTags || /\*\*|^#+\s/m.test(el.innerText);
    if (!needs) return;
    const txt = el.innerText;           // pull text as user saw it
    el.innerHTML = hrTidy(txt);         // replace with cleaned HTML
  }

  function formatExisting() {
    document.querySelectorAll(".bubble").forEach(formatBubble);
  }

  // Run once on load (in case content already present)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", formatExisting);
  } else {
    formatExisting();
  }

  // Observe future message insertions
  const host = document.getElementById("thread") || document.body;
  const mo = new MutationObserver(muts => {
    for (const m of muts) {
      m.addedNodes && m.addedNodes.forEach(node => {
        if (!(node instanceof HTMLElement)) return;
        if (node.classList?.contains("bubble")) {
          formatBubble(node);
        } else {
          node.querySelectorAll?.(".bubble")?.forEach(formatBubble);
        }
      });
    }
  });
  mo.observe(host, { childList: true, subtree: true });

  // Expose for quick console tests if needed
  window.__hrTidy = hrTidy;
})();
