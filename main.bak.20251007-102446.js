/* main.js — HR Chat UI v27
   - Activate sidebar buttons: New Chat, Save, New Project
   - Projects + History persisted in localStorage
   - Safe DOM + loading badge + clean render (no ** or ###)
*/

;(() => {
  const VERSION = "v27";
  document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);

    // visible version + loading badge safety
    const build = $("build"); if (build) build.textContent = VERSION;
    const loading = $("loading"); if (loading) loading.textContent = "";

    // --- state & storage ---
    const S = loadState();

    function loadState(){
      try{
        const s = JSON.parse(localStorage.getItem("hr.state")||"{}");
        return Object.assign({threads:{}, projects:[], activeThread:null, activeProject:null}, s);
      }catch{ return {threads:{}, projects:[], activeThread:null, activeProject:null}; }
    }
    function saveState(){ localStorage.setItem("hr.state", JSON.stringify(S)); }
    const uid = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36);

    // --- UI refs ---
    const threadEl = $("thread");
    const form = $("composer");
    const queryEl = $("query");
    const sendBtn = $("send");
    const newChatBtn = $("newChatBtn");
    const saveChatBtn = $("saveChatBtn");
    const projectsList = $("projectsList");
    const historyList = $("historyList");

    // --- helpers ---
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
      const lines = text.slice(idx + marker.length).split("\n")
        .map(l => l.trim()).filter(Boolean);
      return { body, sources: lines };
    }
    function msgNode(role, text){
      const { body, sources } = splitSources(text);
      const clean = stripMarkdown(body);
      const wrap = document.createElement("div");
      wrap.className = "msg " + (role === "user" ? "user" : "assistant");
      const p = document.createElement("div");
      p.textContent = clean;
      wrap.appendChild(p);
      if (sources.length) {
        const h = document.createElement("div"); h.className = "sources-head"; h.textContent = "Sources";
        const ul = document.createElement("ul"); ul.className = "sources";
        for (const line of sources) {
          const m = line.match(/^-?\s*(.+?)\s*\((https?:\/\/[^\s)]+)\)\s*$/);
          const li = document.createElement("li");
          if (m) {
            const [, title, url] = m;
            const a = document.createElement("a");
            a.href = url; a.target = "_blank"; a.rel="noopener";
            a.textContent = title; li.appendChild(a);
          } else {
            li.textContent = line.replace(/^-?\s*/, "");
          }
          ul.appendChild(li);
        }
        wrap.appendChild(h); wrap.appendChild(ul);
      }
      return wrap;
    }
    function renderThread(t){
      if (!threadEl) return;
      threadEl.innerHTML = "";
      if (!t || !Array.isArray(t.messages)) return;
      for (const m of t.messages){
        threadEl.appendChild(msgNode(m.role, m.content));
      }
      threadEl.scrollTop = threadEl.scrollHeight;
    }
    function summarizeTitle(messages){
      const firstUser = (messages||[]).find(m => m.role === "user");
      const raw = (firstUser?.content || "").trim();
      return (raw || "New chat").slice(0, 48);
    }

    // --- sidebar renderers ---
    function renderProjects(){
      if (!projectsList) return;
      // Preserve the first static "new-project" item
      const staticFirst = projectsList.querySelector('li[data-action="new-project"]');
      projectsList.innerHTML = "";
      projectsList.appendChild(staticFirst || (() => {
        const li = document.createElement("li");
        li.dataset.action = "new-project"; li.textContent = "+ New Project";
        return li;
      })());

      S.projects.forEach(p => {
        const li = document.createElement("li");
        li.textContent = p.name || "Untitled Project";
        li.dataset.projectId = p.id;
        if (S.activeProject === p.id) li.classList.add("active");
        li.addEventListener("click", () => {
          S.activeProject = p.id;
          saveState();
          renderProjects();
          renderHistory(); // highlight threads tied to project
        });
        projectsList.appendChild(li);
      });

      // click handler for new project
      const add = projectsList.querySelector('li[data-action="new-project"]');
      if (add && !add.__wired) {
        add.__wired = true;
        add.addEventListener("click", () => {
          const name = prompt("Project name?");
          if (!name) return;
          const id = uid();
          S.projects.push({ id, name, threads: [] });
          S.activeProject = id;
          saveState();
          renderProjects();
          renderHistory();
        });
      }
    }
    function renderHistory(){
      if (!historyList) return;
      historyList.innerHTML = "";
      // Flatten threads to list sorted by ts desc
      const items = Object.entries(S.threads).map(([id, t]) => ({ id, ts: t.ts || 0, title: t.title || "New chat" }))
        .sort((a,b)=>b.ts - a.ts).slice(0,200);
      items.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item.title;
        if (S.activeThread === item.id) li.classList.add("active");
        li.addEventListener("click", () => {
          S.activeThread = item.id;
          saveState();
          renderHistory();
          renderThread(S.threads[item.id]);
        });
        historyList.appendChild(li);
      });
    }
    function renderSidebars(){
      try { renderProjects(); renderHistory(); }
      catch(e){ console.warn("renderSidebars guarded:", e); }
    }

    // --- core actions ---
    function newChat(){
      const id = uid();
      S.threads[id] = { id, title: "New chat", messages: [], ts: Date.now() };
      S.activeThread = id;
      saveState();
      renderHistory();
      renderThread(S.threads[id]);
      if (queryEl) { queryEl.value = ""; queryEl.focus(); }
    }
    function saveChat(){
      const id = S.activeThread || uid();
      const domMsgs = Array.from(threadEl?.querySelectorAll(".msg")||[]).map(n=>{
        const isUser = n.classList.contains("user");
        return { role: isUser ? "user" : "assistant", content: (n.textContent||"").trim() };
      });
      if (!S.threads[id]) S.threads[id] = { id, messages: [], ts: 0, title: "New chat" };
      S.threads[id].messages = domMsgs;
      S.threads[id].title = summarizeTitle(domMsgs);
      S.threads[id].ts = Date.now();
      S.activeThread = id;
      if (S.activeProject){
        const proj = S.projects.find(p => p.id === S.activeProject);
        if (proj && !proj.threads.includes(id)) proj.threads.unshift(id);
      }
      saveState();
      renderHistory();
    }

    // --- wire buttons ---
    if (newChatBtn && !newChatBtn.__wired){
      newChatBtn.__wired = true;
      newChatBtn.addEventListener("click", (e)=>{ e.preventDefault(); newChat(); });
    }
    if (saveChatBtn && !saveChatBtn.__wired){
      saveChatBtn.__wired = true;
      saveChatBtn.addEventListener("click", (e)=>{ e.preventDefault(); saveChat(); alert("Saved"); });
    }

    // --- sending flow ---
    async function talk(userText){
      if (!threadEl) return;
      // show user
      threadEl.appendChild(msgNode("user", userText));
      threadEl.scrollTop = threadEl.scrollHeight;

      // call API
      try {
        if (loading) loading.textContent = "loading…";
        const r = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify({ messages: [
            { role:"user", content: userText }
          ] })
        });
        const j = await r.json();
        const reply = j?.reply || "No reply received.";
        threadEl.appendChild(msgNode("assistant", reply));
        threadEl.scrollTop = threadEl.scrollHeight;
        // autosave
        saveChat();
      } catch (e) {
        threadEl.appendChild(msgNode("assistant", "Network error. Try again."));
      } finally {
        if (loading) loading.textContent = "";
      }
    }

    if (form && !form.__wired){
      form.__wired = true;
      form.addEventListener("submit", (e)=>{
        e.preventDefault();
        const text = (queryEl?.value || "").trim();
        if (!text) return;
        queryEl.value = "";
        if (!S.activeThread) newChat();
        talk(text);
      });
      const onKey = (e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); form.requestSubmit(); } };
      queryEl?.addEventListener("keydown", onKey);
      sendBtn?.addEventListener("click", (e)=>{ e.preventDefault(); form.requestSubmit(); });
    }

    // --- boot ---
    (function boot(){
      if (!S.activeThread) newChat(); else renderThread(S.threads[S.activeThread]);
      renderSidebars();
      console.log("[HR] main.js", VERSION, "booted", new Date().toISOString());
    })();
  });
})();
