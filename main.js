/* main.js — HR Chat UI v12 (plain text render + sources + safe loading)
   - Clean render (no markdown artifacts)
   - Sources section parsed from "\n\nSources:\n- Title (URL)"
   - Solid submit flow (Enter to send, Shift+Enter for newline)
   - Spinner always clears (success or error)
   - Auto-detects #query or #input
*/

/* ---------- utilities ---------- */
function stripMarkdown(s) {
  return (s || "")
    .replace(/```[\s\S]*?```/g, "")        // code fences
    .replace(/^#{1,6}\s+/gm, "")           // headings
    .replace(/\*\*(.*?)\*\*/g, "$1")       // bold
    .replace(/__(.*?)__/g, "$1")           // underline
    .replace(/`([^`]+)`/g, "$1")           // inline code
    .trim();
}

function splitSources(text) {
  const marker = "\n\nSources:\n";
  const idx = text.indexOf(marker);
  if (idx === -1) return { body: text, sources: [] };
  const body = text.slice(0, idx);
  const lines = text.slice(idx + marker.length)
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);
  return { body, sources: lines };
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
      // "- Title (https://url)"
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

/* ---------- DOM refs (robust to small ID changes) ---------- */
const form   = document.getElementById("composer");           // <form id="composer">
const input  = document.getElementById("query") || document.getElementById("input"); // <textarea id="query"> or #input
const send   = document.getElementById("send");               // <button id="send">
const thread = document.getElementById("thread");             // <div id="thread">
let   loading = document.getElementById("loading");           // optional spinner
if (!loading) {
  loading = document.createElement("div");
  loading.id = "loading";
  loading.className = "hidden";
  loading.textContent = "Loading…";
  (form || document.body).appendChild(loading);
}

/* ---------- state ---------- */
const messages = []; // { role: 'user'|'assistant', content: string }
function pushUser(text)     { messages.push({ role: "user",      content: text }); }
function pushAssistant(text){ messages.push({ role: "assistant", content: text }); }

/* ---------- helpers ---------- */
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

function addAssistantBubble(text) {
  const node = renderReply(text);
  thread.appendChild(node);
  scrollToBottom();
}

function shouldForceSearch(q) {
  const s = (q || "").toLowerCase();
  // Gentle heuristic: only force search on clearly "fresh" asks
  return /today|latest|this week|rate|rates|news|current|now|fed|cpi|jobs|treasury/.test(s);
}

function setLoading(on) {
  if (!loading) return;
  loading.classList.toggle("hidden", !on);
  if (send) send.disabled = on;
}

/* ---------- wire Enter behavior ---------- */
if (input) {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form?.requestSubmit();
    }
  });
}

/* ---------- wire send button ---------- */
if (send && form) {
  send.addEventListener("click", (e) => {
    e.preventDefault();
    form.requestSubmit();
  });
}

/* ---------- submit handler ---------- */
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = (input?.value || "").trim();
    if (!q) return;

    // optimistic user bubble
    addUserBubble(q);
    pushUser(q);

    // go loading
    setLoading(true);

    try {
      const payload = {
        messages: [...messages],
        forceSearch: shouldForceSearch(q)
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      // parse
      let data = {};
      try { data = await res.json(); } catch {}
      const reply = typeof data?.reply === "string" ? data.reply : "Sorry — no answer.";

      // render + store
      addAssistantBubble(reply);
      pushAssistant(reply);
    } catch (err) {
      console.error("composer submit error", err);
      addAssistantBubble("Sorry — something went wrong. Try again.");
    } finally {
      setLoading(false);
      if (input) input.value = "";
    }
  });
}

/* ---------- boot ping + tiny banner version ---------- */
(async function boot() {
  try {
    console.log("main.js v12 loaded");
    const r = await fetch("/api/ping", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const j = await r.json();
    console.log("ping:", j);
  } catch (e) {
    console.warn("ping failed", e);
  }
})();

// v12-mobile linked 2025-10-03T16:48:05
