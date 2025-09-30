// /api/chat.js  → POST /api/chat
// Version: hr-chat-smart-stub-v1 (contextual + varied replies, no API key)
//
// What it does:
// - Parses { message } safely
// - Detects common mortgage topics
// - Picks a response template deterministically (varies per message)
// - Falls back to a useful echo with next-step prompts

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const text = (body && body.message ? String(body.message) : '').trim();

    if (!text) {
      res.status(400).json({ error: 'Missing `message` in body' });
      return;
    }

    const reply = generateReply(text);
    res.status(200).json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
};

/* ---------- helpers ---------- */

function readJsonBody(req) {
  // Vercel sometimes parses automatically; if not, parse the raw stream.
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
  });
}

// Pick a stable variant based on message (so similar messages feel consistent)
function pick(arr, seedStr) {
  const h = Math.max(1, hash(seedStr));
  return arr[h % arr.length];
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function generateReply(userText) {
  const t = userText.toLowerCase();

  // Topic detection (lightweight heuristics)
  if (/(^|\s)2\/1(\s|$)|buy\s*down|rate buydown/.test(t)) return topicBuydown(userText);
  if (/seller credit|concession|price cut|price reduction/.test(t)) return topicSellerCredit(userText);
  if (/\brate(s)?\b|apr|interest/.test(t)) return topicRates(userText);
  if (/refi|refinance/.test(t)) return topicRefi(userText);
  if (/jumbo/.test(t)) return topicJumbo(userText);
  if (/\bfico\b|credit score|credit report/.test(t)) return topicCredit(userText);
  if (/\bdti\

