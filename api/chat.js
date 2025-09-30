// /api/chat.js  → https://chat.homerates.ai/api/chat
// Vercel Node.js Serverless Function (no frameworks)

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    // Robust body parse (works whether Vercel parsed it or not)
    let body = req.body;
    if (!body || typeof body !== 'object') {
      let raw = '';
      await new Promise((resolve) => {
        req.on('data', (chunk) => (raw += chunk));
        req.on('end', resolve);
      });
      try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
    }

    const { message } = body || {};
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Missing `message` in body' });
      return;
    }

    // Stub reply (swap this with your model call when ready)
    const reply =
      "Got it. Give me a target price, down payment, and time horizon — I’ll map the trade-offs and where the math starts working in your favor.";

    res.status(200).json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
};
