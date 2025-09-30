async function readJsonBody(req) {
  // If Vercel already parsed it:
  if (req.body) return req.body;
  // Otherwise, read the raw stream
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8') || '';
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const messages = Array.isArray(body?.messages) ? body.messages : null;
    if (!messages || messages.length === 0) {
      res.status(400).json({ error: 'Missing messages array' });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Server not configured: missing OPENAI_API_KEY' });
      return;
    }

    const policy = [{
      role: 'system',
      content: 'Safety/compliance: educational only; no legal/tax advice; assume California; when uncertain, state assumptions and offer options.'
    }];

    const payload = {
      model: process.env.CHAT_MODEL || 'gpt-4o-mini',
      messages: [...policy, ...messages],
      temperature: 0.4,
      top_p: 0.9,
      max_tokens: Number(process.env.RESPONSE_MAX_TOKENS || 600)
    };

    // use global fetch (Node 20 guarantees it)
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': Bearer ,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    if (!r.ok) {
      // Bubble up OpenAI error body so you can see it in the client
      res.status(r.status).json({ error: 'Upstream error', detail: text.slice(0, 2000) });
      return;
    }

    let j = {};
    try { j = JSON.parse(text); } catch { /* ignore */ }

    const reply = j?.choices?.[0]?.message?.content?.trim() || '';
    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ error: 'Function crash', detail: String(e?.message || e) });
  }
}