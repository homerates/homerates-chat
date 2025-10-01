async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = ''; for await (const chunk of req) raw += chunk;
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
module.exports = async function (req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const body = await readBody(req);
    const messages = Array.isArray(body?.messages) ? body.messages : null;
    if (!messages?.length) { res.status(400).json({ error: 'Missing messages array' }); return; }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) { res.status(500).json({ error: 'Missing OPENAI_API_KEY in env' }); return; }

    // cheap ping short-circuit
    if ((messages[0]?.content||'').toLowerCase() === 'ping') { res.status(200).json({ reply: 'pong' }); return; }

    const policy = [{
      role: 'system',
      content: [
        "You are GPT-5 Thinking for HomeRates.ai. California mortgage guidance only. Educational; not a commitment to lend.",
        "State assumptions. Be specific on math and programs (Access Zero, DSCR, Jumbo Advantage, FHA/VA).",
        "STYLE: No markdown syntax. No **, ##, or code fences. Use short paragraphs and plain bullet lines starting with '-' only.",
        "If users ask for rates, show ranges + drivers, and note that rates change daily."
      ].join(" ")
    }];

    const payload = {
      model: process.env.CHAT_MODEL || 'gpt-4o-mini',
      messages: [...policy, ...messages],
      temperature: 0.4,
      top_p: 0.9,
      max_tokens: Number(process.env.RESPONSE_MAX_TOKENS || 700)
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    if (!r.ok) { res.status(r.status).json({ error: "Upstream error", detail: text.slice(0,1000) }); return; }

    let j={}; try { j=JSON.parse(text); } catch {}
    const reply = j?.choices?.[0]?.message?.content?.trim() || "";
    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: "Function crash", detail: String(err?.stack || err) });
  }
};