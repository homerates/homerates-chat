// /api/chat.js  → POST /api/chat
// Version: hr-chat-smart-stub-v2 (robust body parsing)

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

async function readJsonBody(req) {
  // Already parsed?
  if (req.body) {
    if (typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch { return {}; }
    }
  }
  // Parse raw stream
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () =
