  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'No messages provided' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages
      })
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).send(err);
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content ?? '';
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}
