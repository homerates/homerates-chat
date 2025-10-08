// main.v34.js — safe boot, no crashes if elements are missing

// --- small helper: DOM ready
function onReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

// --- UI helpers (safe, null-guarded)
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function appendMessage(role, content) {
  const thread = document.getElementById('thread');
  if (!thread) return;
  const div = document.createElement('div');
  div.className = `msg ${role === 'user' ? 'user' : 'assistant'}`;
  div.textContent = content;
  thread.appendChild(div);
  thread.scrollTop = thread.scrollHeight;
}

// --- Fake API call placeholder (replace with your real /api/chat call)
async function sendToAPI(prompt) {
  // TODO: replace with real fetch('/api/chat', { ... })
  // This is just a stub so the UI moves.
  await new Promise(r => setTimeout(r, 250));
  return { ok: true, text: `You said: ${prompt}` };
}

// --- Wire buttons and composer
function wireControls() {
  const composer = document.getElementById('composer');
  const query = document.getElementById('query');
  const send = document.getElementById('send');

  if (composer && query && send) {
    composer.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = (query.value || '').trim();
      if (!text) return;

      appendMessage('user', text);
      query.value = '';
      setText('loading', '…');

      try {
        const res = await sendToAPI(text);
        if (res && res.ok) {
          appendMessage('assistant', res.text);
        } else {
          appendMessage('assistant', 'Hmm, that didn’t work. Try again.');
        }
      } catch (err) {
        console.error(err);
        appendMessage('assistant', 'Network hiccup. Try again.');
      } finally {
        setText('loading', '');
      }
    });
  }

  const newChatBtn = document.getElementById('newChatBtn');
  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      const thread = document.getElementById('thread');
      if (thread) thread.innerHTML = '';
    });
  }

  const saveChatBtn = document.getElementById('saveChatBtn');
  if (saveChatBtn) {
    saveChatBtn.addEventListener('click', () => {
      // Placeholder: implement real save
      appendMessage('assistant', 'Saved (placeholder).');
    });
  }

  const newProjectBtn = document.getElementById('newProjectBtn');
  if (newProjectBtn) {
    newProjectBtn.addEventListener('click', () => {
      // Placeholder: implement real project creation
      appendMessage('assistant', 'New project (placeholder).');
    });
  }
}

// --- Optional: show a build tag bottom-right
function setBuildTag() {
  setText('build', 'build: main.v34');
}

// --- Sidebar render (updates existing elements only; won’t create new DOM)
function renderSidebars() {
  // Left title exists in HTML (#left-title). Right title is optional.
  setText('left-title', 'HomeRates.ai — Shortcuts');
  // Only set right title if you add an element with id="right-title" later.
  const rightTitle = document.getElementById('right-title');
  if (rightTitle) rightTitle.textContent = 'Session Info';
}

// --- App boot (guarded)
function boot() {
  try {
    wireControls();
    renderSidebars();
    setBuildTag();
  } catch (e) {
    console.error('Boot failed:', e);
  }
}

onReady(boot);
