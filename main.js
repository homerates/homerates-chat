/* HR v31 — 2025-10-07 14:25:15 */
console.log('[HR] main.js v31 live @ ' + new Date().toISOString());
/* HR live bump v30 — 2025-10-07 11:08:50 */
console.log('[HR] main.js v30 live @ ' + new Date().toISOString());
;(() => {
  try{
    document.addEventListener('DOMContentLoaded', () => {
      const el = (id) => document.getElementById(id);
      const build = el('build'); if (build) build.textContent = 'v26';
      const loading = el('loading'); if (loading) loading.textContent = '';
      console.log('[HR] main.js v26 guard @', new Date().toISOString());
    });
    // Wrap fetch so the 'loading…' badge reflects actual requests
    if (!window.__hrFetchWrapped) {
      const _f = window.fetch.bind(window);
      window.fetch = async (...args) => {
        try { const L = document.getElementById('loading'); if (L) L.textContent = 'loading…'; } catch(_){}
        try { return await _f(...args); }
        finally { try { const L2 = document.getElementById('loading'); if (L2) L2.textContent = ''; } catch(_){} }
      };
      window.__hrFetchWrapped = true;
    }
  }catch(e){ console.error('v26 guard failed', e); }
})();
/* main.js â€” HR Chat UI v31
   - Clean render (no ** or ###), Sources list
   - Solid loading behavior
   - Sidebar wired: New Chat, Save Chat, New Project, Projects list, Saved threads
   - LocalStorage persistence (simple)
   - Visible version stamp
*/

/* ---------- version ---------- */
const UI_VERSION = "UI v20251003-13";

/* ---------- utilities ---------- */
function stripMarkdown(s) {
  return (s || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}
function splitSources(text) {
  const marker = "\n\nSources:\n";
  const idx = text.indexOf(marker);
  if (idx === -1) return { body: text, sources: [] };
  const body = text.slice(0, idx);
  const lines = text.slice(idx + marker.length)
    .split("\n").map(l => l.trim()).filter(Boolean);
  return { body, sources: lines };
}

/* ---------- DOM ---------- */
const form   = document.getElementById("composer");
const input  = document.getElementById("query") || document.getElementById("input");
const send   = document.getElementById("send");
const thread = document.getElementById("thread");
const versionEl = document.getElementById("version");
const btnNewChat = document.getElementById("new-chat");
const btnSaveChat = document.getElementById("save-chat");
const btnNewProject = document.getElementById("new-project");
const projectsList = document.getElementById("projects-list");
const savedList = document.getElementById("saved-list");

let loading = document.getElementById("loading");
if (!loading) {
  loading = document.createElement("div");
  loading.id = "loading";
  loading.className = "hidden";
  loading.textContent = "Loadingâ€¦";
  (form || document.body).appendChild(loading);
}

/* ---------- state & storage ---------- */
const STORE_KEY = "HR_STATE_V1";

let state = {
  messages: [],                 // current chat
  savedThreads: [],             // [{id, title, messages, ts, projectId|null}]
  projects: []                  // [{id, name}]
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) state = { ...state, ...JSON.parse(raw) };
  } catch {}
}
function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
}
function uuid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function renderSidebars() {
  // projects
  if (!state.projects.length) {
    projectsList.textContent = "None yet";
  } else {
    projectsList.textContent = "";
    state.projects.forEach(p => {
      const btn = document.createElement("button");
      btn.className = "sideitem";
      btn.textContent = p.name;
      btn.title = "Show threads in " + p.name;
      btn.addEventListener("click", () => filterSavedByProject(p.id));
      projectsList.appendChild(btn);
    });
    // Add an "All" filter
    const allBtn = document.createElement("button");
    allBtn.className = "sideitem";
    allBtn.textContent = "All Projects";
    allBtn.addEventListener("click", () => filterSavedByProject(null, true));
    projectsList.appendChild(allBtn);
  }

  // saved threads
  const items = savedFilter.active ? savedByProject(state.savedThreads, savedFilter.projectId) : state.savedThreads;
  if (!items.length) {
    savedList.textContent = "No saved threads";
  } else {
    savedList.textContent = "";
    items
      .slice()
      .sort((a,b)=>b.ts - a.ts)
      .forEach(t => {
        const btn = document.createElement("button");
        btn.className = "sideitem";
        const date = new Date(t.ts).toLocaleString();
        btn.textContent = t.title || ("Thread " + date);
        btn.title = date + (t.projectId ? " â€¢ " + (state.projects.find(p=>p.id===t.projectId)?.name||"") : "");
        btn.addEventListener("click", () => loadThread(t.id));
        savedList.appendChild(btn);
      });
  }
}

const savedFilter = { active:false, projectId:null };
function filterSavedByProject(projectId, disable=false) {
  savedFilter.active = !disable && projectId !== null;
  savedFilter.projectId = projectId || null;
  renderSidebars();
}
function savedByProject(list, projectId) {
  return list.filter(t => t.projectId === projectId);
}

/* ---------- chat render ---------- */
function scrollToBottom() { thread && (thread.scrollTop = thread.scrollHeight); }
function addUserBubble(text) {
  const wrap = document.createElement("div");
  wrap.className = "msg user";
  const p = document.createElement("p");
  p.textContent = text;
  wrap.appendChild(p);
  thread.appendChild(wrap);
  scrollToBottom();
}
function renderReply(text) {
  const { body, sources } = splitSources(text || "");
  const clean = stripMarkdown(body);
  const wrap = document.createElement("div");
  wrap.className = "msg assistant";
  const p = document.createElement("p");
  p.textContent = clean || "No answer.";
  wrap.appendChild(p);
  if (sources.length) {
    const h = document.createElement("div");
    h.className = "sources-head";
    h.textContent = "Sources";
    wrap.appendChild(h);
    const ul = document.createElement("ul");
    ul.className = "sources";
    for (const line of sources) {
      const m = line.match(/^-?\s*(.+?)\s*\((https?:\/\/[^\s)]+)\)\s*$/);
      const li = document.createElement("li");
      if (m) {
        const [, title, url] = m;
        const a = document.createElement("a");
        a.href = url; a.target = "_blank"; a.rel = "noopener";
        a.textContent = title;
        li.appendChild(a);
      } else {
        li.textContent = line.replace(/^-?\s*/, "");
      }
      ul.appendChild(li);
    }
    wrap.appendChild(ul);
  }
  return wrap;
}
function addAssistantBubble(text) {
  const node = renderReply(text);
  thread.appendChild(node);
  scrollToBottom();
}

/* ---------- helpers ---------- */
function setLoading(on) {
  loading?.classList.toggle("hidden", !on);
  if (send) send.disabled = on;
}
function shouldForceSearch(q) {
  const s = (q || "").toLowerCase();
  return /today|latest|this week|rate|rates|news|current|now|fed|cpi|jobs|treasury|mortgage/.test(s);
}

/* ---------- wire events ---------- */
if (input) {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form?.requestSubmit();
    }
  });
}
if (send && form) {
  send.addEventListener("click", (e) => {
    e.preventDefault();
    form.requestSubmit();
  });
}
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = (input?.value || "").trim();
    if (!q) return;

    addUserBubble(q);
    state.messages.push({ role:"user", content:q });
    saveState();

    setLoading(true);
    try {
      const payload = { messages: [...state.messages], forceSearch: shouldForceSearch(q) };
      const res = await fetch("/api/chat", {
        method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload)
      });
      let data = {}; try { data = await res.json(); } catch {}
      const reply = typeof data?.reply === "string" ? data.reply : "Sorry â€” no answer.";
      addAssistantBubble(reply);
      state.messages.push({ role:"assistant", content:reply });
      saveState();
    } catch (err) {
      console.error("composer submit error", err);
      addAssistantBubble("Sorry â€” something went wrong. Try again.");
    } finally {
      setLoading(false);
      if (input) input.value = "";
    }
  });
}

/* ---------- sidebar actions ---------- */
function newChat() {
  state.messages = [];
  thread.innerHTML = "";
  saveState();
}
function saveChat() {
  if (!state.messages.length) { alert("Nothing to save yet."); return; }
  const title = prompt("Name this thread:", summaryFromMessages(state.messages));
  if (!title) return;

  // optional: choose project
  let projectId = null;
  if (state.projects.length) {
    const names = state.projects.map((p,i)=>`${i+1}. ${p.name}`).join("\n");
    const pick = prompt("Assign to project? Enter number or leave blank:\n" + names);
    const idx = pick ? (parseInt(pick,10)-1) : -1;
    if (idx >= 0 && idx < state.projects.length) projectId = state.projects[idx].id;
  }

  state.savedThreads.push({
    id: uuid(),
    title,
    messages: [...state.messages],
    projectId,
    ts: Date.now()
  });
  saveState();
  renderSidebars();
}
function newProject() {
  const name = prompt("New project name:");
  if (!name) return;
  state.projects.push({ id: uuid(), name: name.trim() });
  saveState();
  renderSidebars();
}
function loadThread(id) {
  const t = state.savedThreads.find(x => x.id === id);
  if (!t) return;
  state.messages = [...t.messages];
  thread.innerHTML = "";
  for (const m of state.messages) {
    if (m.role === "user") addUserBubble(m.content);
    else addAssistantBubble(m.content);
  }
  saveState();
}

function summaryFromMessages(msgs) {
  const u = msgs.find(m=>m.role==="user");
  if (!u) return "Chat";
  return (u.content || "Chat").slice(0, 60);
}

/* ---------- boot ---------- */
(function boot(){
  versionEl && (versionEl.textContent = UI_VERSION);
  loadState();
  renderSidebars();

  // ping in console
  fetch("/api/ping", { method:"POST", headers:{ "Content-Type":"application/json" }, body:"{}" })
    .then(r=>r.json()).then(j=>console.log("ping:", j)).catch(()=>{});

  // re-render current messages into thread
  if (state.messages.length) {
    thread.innerHTML = "";
    for (const m of state.messages) {
      if (m.role === "user") addUserBubble(m.content);
      else addAssistantBubble(m.content);
    }
  }
})();

/* ---------- bind buttons ---------- */
btnNewChat?.addEventListener("click", newChat);
btnSaveChat?.addEventListener("click", saveChat);
btnNewProject?.addEventListener("click", newProject);



;(() => {
  try {
    const log=(...a)=>console.log('[HR v31]',...a);
    const byId=(id)=>document.getElementById(id);
    document.addEventListener('DOMContentLoaded', () => {
      const build=byId('build'); if (build) build.textContent='v31';
      const loading=byId('loading'); if (loading) loading.textContent='';

      // core elements (all optional, guarded)
      const thread = byId('thread');
      const form   = byId('composer');
      const input  = byId('query') || byId('input');

      // sidebar targets (ids may vary; all guarded)
      const newBtn   = byId('new-chat')     || byId('nav-new');
      const saveBtn  = byId('save-chat')    || byId('nav-save');
      const projBtn  = byId('new-project')  || byId('nav-project');
      const projList = byId('projects-list')|| byId('projects');
      const savedList= byId('saved-list')   || byId('archives');

      // simple storage
      const store = {
        get(k,def){ try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } },
        set(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
      };
      let threads  = store.get('hr:threads', []);
      let projects = store.get('hr:projects', []);

      function renderLists(){
        if (savedList) {
          savedList.innerHTML='';
          threads.forEach((t,i)=>{
            const li=document.createElement('li');
            const a=document.createElement('a');
            a.href='#'; a.textContent=t.title || ('Chat '+(i+1));
            a.onclick=(e)=>{ e.preventDefault(); if (thread) { thread.innerHTML=t.html||''; thread.scrollTop=thread.scrollHeight; } };
            li.appendChild(a); savedList.appendChild(li);
          });
        }
        if (projList) {
          projList.innerHTML='';
          projects.forEach((p,i)=>{
            const li=document.createElement('li');
            li.textContent=p.name || ('Project '+(i+1));
            projList.appendChild(li);
          });
        }
      }

      if (newBtn && thread) {
        newBtn.onclick=(e)=>{ e.preventDefault(); thread.innerHTML=''; input && input.focus(); log('new chat'); };
      }

      if (saveBtn && thread) {
        saveBtn.onclick=(e)=>{
          e.preventDefault();
          const title = (input && input.value.trim()) || 'Saved chat';
          threads.unshift({ title, html: thread.innerHTML, ts: Date.now() });
          threads = threads.slice(0,50);
          store.set('hr:threads', threads);
          renderLists();
          log('saved chat', title);
        };
      }

      if (projBtn) {
        projBtn.onclick=(e)=>{
          e.preventDefault();
          const name = prompt('Project name?');
          if (!name) return;
          projects.unshift({ name, ts: Date.now() });
          projects = projects.slice(0,100);
          store.set('hr:projects', projects);
          renderLists();
          log('new project', name);
        };
      }

      renderLists();
      log('sidebar wired v31');
    });
  } catch(e) { console.warn('v31 augment guard', e); }
})();

