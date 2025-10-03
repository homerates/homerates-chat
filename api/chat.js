import fetch from "node-fetch"; // Vercel includes this; safe shim
async function readBody(req) {
  return new Promise((resolve) => {
    try {
      if (req.body && typeof req.body === "object") return resolve(req.body);
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
      });
    } catch {
      resolve({});
    }
  });
}

async function maybeSearch(query) {
  try {
    if (!process.env.TAVILY_API_KEY) return [];
    const resp = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.TAVILY_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query, max_results: 3 })
    });
    const data = await resp.json();
    return (data.results || []).map(r => `- ${r.title} (${r.url})`);
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const body = await readBody(req);
    const messages = Array.isArray(body?.messages) ? body.messages : null;
    if (!messages?.length) {
      res.status(400).json({ error: "Missing messages array", got: body });
      return;
    }

    const last = messages[messages.length - 1]?.content || "";
    if (last.trim().toLowerCase() === "ping") {
      res.status(200).json({ reply: "pong (openai+tavily v1)" });
      return;
    }

    let context = "";
    if (body.forceSearch) {
      const sources = await maybeSearch(last);
      if (sources.length) {
        context = "\n\nGrounding sources:\n" + sources.join("\n");
      }
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      res.status(500).json({ error: "Missing OPENAI_API_KEY" });
      return;
    }

    const model = process.env.CHAT_MODEL || "gpt-4o-mini";
    const payload = {
      model,
      temperature: body.temperature ?? 0.4,
      max_tokens: Number(process.env.RESPONSE_MAX_TOKENS || 900),
      messages: [
        {
          role: "system",
          content: "You are GPT-5 for HomeRates.ai. Plain text only, no markdown. Short, clean paragraphs."
        },
        ...messages,
        ...(context ? [{ role: "system", content: context }] : [])
      ]
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + OPENAI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    const j = JSON.parse(text || "{}");
    const reply = j?.choices?.[0]?.message?.content?.trim() || "";

    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: "Chat crash", detail: String(err?.stack || err) });
  }
}
