const VERSION = "chat.js v20251003-1";  // update last digit if you push again today
console.log(`${VERSION} deployed at ${new Date().toISOString()}`);



console.log("chat.js vTavily-safe deployed", new Date().toISOString());


// api/chat.js — OpenAI + Tavily safe handler

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
  } catch (e) {
    console.error("maybeSearch fail", e);
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
      res.status(200).json({ reply: "pong (openai+tavily safe)" });
      return;
    }

    let context = "";
    if (body.forceSearch) {
      const sources = await maybeSearch(last);
      if (sources.length) {
        context = "\n\nSources:\n" + sources.join("\n");
      }
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      res.status(500).json({ error: "Missing OPENAI_API_KEY" });
      return;
    }

    const payload = {
      model: process.env.CHAT_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content: "You are GPT-5 for HomeRates.ai. Plain text only. Short, clean paragraphs."
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

    const j = await r.json();
    const reply = j?.choices?.[0]?.message?.content?.trim() || "";
    res.status(200).json({ reply });
  } catch (err) {
    console.error("chat.js crash", err);
    res.status(500).json({ error: "Chat crash", detail: String(err) });
  }
}
