/* app.v31.js â€” HR Chat UI v31
   - Modernized ChatGPT-style logic
   - Sidebar interactivity (New Chat, Save Chat, New Project)
   - Works with index.html (Ask Me Anything)
   - Author: HomeRates.ai Prototype | Oct 2025
*/

console.log("ðŸ§  HomeRates.ai â€” app.v31.js loaded");

const threadEl = document.getElementById("thread");
const queryEl = document.getElementById("query");
const sendBtn = document.getElementById("send");
const buildEl = document.getElementById("build");
const loadingEl = document.getElementById("loading");

const newChatBtn = document.getElementById("newChatBtn");
const saveChatBtn = document.getElementById("saveChatBtn");
const newProjectBtn = document.getElementById("newProjectBtn");

// ----- UI Helpers -----
function appendMessage(role, text) {
  const div = document.createElement("div");
  div.className = "msg " + (role === "user" ? "user" : "assistant");
  div.textContent = text;
  threadEl.appendChild(div);
  threadEl.scrollTop = threadEl.scrollHeight;
}

function setLoading(state) {
  loadingEl.textContent = state ? "Loading..." : "";
}

function resetChat() {
  threadEl.innerHTML = "";
  appendMessage("assistant", "New chat started. Ask me anything about mortgages or homeownership.");
}

function saveChat() {
  const history = threadEl.innerText;
  const blob = new Blob([history], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `HomeRates_Chat_${new Date().toISOString().slice(0, 19)}.txt`;
  a.click();
}

function newProject() {
  appendMessage("assistant", "ðŸ“ Project created. You can organize saved chats here soon.");
}

// ----- Event Handlers -----
newChatBtn?.addEventListener("click", resetChat);
saveChatBtn?.addEventListener("click", saveChat);
newProjectBtn?.addEventListener("click", newProject);

document.getElementById("composer")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = queryEl.value.trim();
  if (!query) return;

  appendMessage("user", query);
  queryEl.value = "";
  setLoading(true);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: query }] }),
    });
    const data = await res.json();
    appendMessage("assistant", data.reply || "(no response)");
  } catch (err) {
    appendMessage("assistant", "âš ï¸ Error reaching HomeRates.ai engine.");
    console.error(err);
  } finally {
    setLoading(false);
  }
});

// ----- Boot Banner -----
buildEl.textContent = "app.v31.js active";
console.log("âœ… HR Chat UI initialized â€” v31");

;(()=>{try{
  const el = document.getElementById('build') || document.body.appendChild(
    Object.assign(document.createElement('div'),{id:'build',style:'position:fixed;right:10px;bottom:10px;opacity:.6;font:12px system-ui;z-index:9999'})
  );
  el.textContent = 'main.v32.js live 20251007-201505';
  console.log('LOADED main.v32.js','20251007-201505');
}catch(e){console.warn('stamp err',e)}})();
