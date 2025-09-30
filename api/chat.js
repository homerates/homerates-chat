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
    if (!body) {
      let raw = '';
      await new Promise((resolve) => {
        req.on('data', (c) => (raw += c));
        req.on('end', resolve);
      });
      try { body = JSON.parse(raw || '{}'); } catch { body = {}; }
    }

    const { message } = body || {};
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Missing `message` in body' });
      return;
    }

    // TODO: replace with your real model call later.
    const reply =
      "Got it. Give me a target price, down payment, and time horizon — I’ll map the trade-offs and where the math starts working in your favor.";

    res.status(200).json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
};
