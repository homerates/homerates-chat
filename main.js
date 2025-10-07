;(() => {
  try{
    document.addEventListener('DOMContentLoaded', () => {
      const byId = (id) => document.getElementById(id) || null;

      // version badge (optional)
      const build = byId('build'); if (build) build.textContent = 'v24';

      // loading helper
      const L = byId('loading');
      window.__hrSetLoading = (on) => { if (L) L.textContent = on ? 'loading…' : ''; };
      window.__hrSetLoading(false);

      // make any sidebar render code null-safe
      window.__hrSafeText = (id, txt) => { const n = byId(id); if (n) n.textContent = txt; };
      window.__hrSafeList = (id, items) => {
        const ul = byId(id); if (!ul) return;
        ul.innerHTML = '';
        (items||[]).forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      };

      console.log('[HR] main.js v24 guard loaded @', new Date().toISOString());
    });

    // Wrap fetch so the loading dot reflects actual requests without touching your chat code
    if (!window.__hrFetchWrapped) {
      const _f = window.fetch.bind(window);
      window.fetch = async (...args) => {
        if (window.__hrSetLoading) window.__hrSetLoading(true);
        try { return await _f(...args); }
        finally { if (window.__hrSetLoading) window.__hrSetLoading(false); }
      };
      window.__hrFetchWrapped = true;
    }
  } catch(e) {
    console.error('v24 guard failed', e);
  }
})();
;(() => {
  try{
    const VERSION = 'v23';
    // version badge
    const b = document.getElementById('build'); if (b) b.textContent = VERSION;
    // loading control
    const L = document.getElementById('loading');
    const setLoading = (on) => { if (L) L.textContent = on ? 'loading…' : ''; };
    setLoading(false); // hide at boot

    // wrap fetch so loading is accurate without touching your chat code
    if (!window.__hrFetchWrapped) {
      const _f = window.fetch.bind(window);
      window.fetch = async (...args) => {
        setLoading(true);
        try { return await _f(...args); }
        finally { setLoading(false); }
      };
      window.__hrFetchWrapped = true;
    }

    console.log('[HR] main.js', VERSION, 'loaded @', new Date().toISOString());
  }catch(e){ console.error('v23 shim failed', e); }
})();
console.log('[HR] main.js v22 loaded @', new Date().toISOString());
(async function(){ try{
console.log('[HR] main.js v21 loaded @', new Date().toISOString());
/* main.js â€” HR Chat UI v13
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

}catch(e){ console.error('main.js boot fail', e); const t=document.getElementById('thread'); if(t){ const m=document.createElement('div'); m.className='msg'; m.textContent='Client error: '+(e&&e.message?e.message:String(e)); t.appendChild(m);} }})();

;(function(){
  try{
    document.addEventListener('click', function(e){
      var btn = e.target.closest && e.target.closest('#toggleSidebar');
      if (!btn) return;
      document.body.classList.toggle('sidebar-open');
    });
    var newBtn = document.getElementById('newChatBtn');
    if (newBtn && window.localStorage) {
      newBtn.addEventListener('click', function(){
        try{
          // Non-destructive: clear composer + append divider in thread
          var q=document.getElementById('query'); if(q) q.value='';
          var t=document.getElementById('thread'); 
          if(t){ var d=document.createElement('div'); d.className='msg'; d.textContent='— New chat —'; t.appendChild(d); t.scrollTop=t.scrollHeight; }
        }catch(_){}
      });
    }
  }catch(e){ console.error('sidebar toggle wire fail', e); }
})();


