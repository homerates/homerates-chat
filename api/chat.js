function readBody(req) {
  return new Promise((resolve) => {
    try {
      if (req.body && typeof req.body === 'object') return resolve(req.body);
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        try { resolve(raw ? JSON.parse(raw) : {}); }
        catch { resolve({}); }
      });
    } catch {
      resolve({});
    }
  });
}

module.exports = async function (req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const body = await readBody(req);
    const msgs = Array.isArray(body?.messages) ? body.messages : null;
    if (!msgs?.length) {
      res.status(400).json({ error: 'Missing messages array' });
      return;
    }

    // quick ping
    const first = (msgs[0]?.content || '').trim().toLowerCase();
    if (first === 'ping') {
      res.status(200).json({ reply: 'pong' });
      return;
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      res.status(500).json({ error: 'Missing OPENAI_API_KEY in env' });
      return;
    }

    const model = process.env.CHAT_MODEL || 'gpt-4o-mini';
    const system = {
      role: 'system',
      content: [
        'You are GPT-5 Thinking for HomeRates.ai.',
        'Write in short clean paragraphs; use plain dashes for bullets.',
        'Do NOT output Markdown fences or stray ** or ##.'
      ].join(' ')
    };

    const payload = {
      model,
      temperature: body.temperature ?? 0.4,
      top_p: body.top_p ?? 0.9,
      max_tokens: Number(process.env.RESPONSE_MAX_TOKENS || 900),
      messages: [system, ...msgs]
    };

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + OPENAI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    if (!r.ok) {
      res.status(r.status).json({ error: 'Upstream error', detail: text.slice(0, 1000) });
      return;
    }

    let j = {};
    try { j = JSON.parse(text); } catch {}
    const reply = j?.choices?.[0]?.message?.content?.trim() || '';

    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: 'Function crash', detail: String(err?.stack || err) });
  }
};