const VERSION = "chat.js v20251003-5";

// ----- helpers -----
async function readBody(req) {
  return new Promise((resolve) => {
    try {
      if (req.body && typeof req.body === "object") return resolve(req.body);
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } });
    } catch { resolve({}); }
  });
}

async function tavilySearch(query) {
  try {
    const key = process.env.TAVILY_API_KEY;
    if (!key) return [];
    const resp = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ query, max_results: 3 })
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data.results) ? data.results.map(r => `- ${r.title} (${r.url})`) : [];
  } catch (e) {
    console.error("tavilySearch fail", e);
    return [];
  }
}

function wantsFreshInfo(text) {
  const s = (text || "").toLowerCase();
  return /today|latest|this week|rate|rates|current|now|fed|cpi|jobs|treasury/.test(s);
}

export default async function handler(req, res) {
  try {
    console.log(VERSION, "start", new Date().toISOString());

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

    const last = (messages[messages.length - 1]?.content || "").trim();
    if (last.toLowerCase() === "ping") {
      res.status(200).json({ reply: "pong (openai+tavily safe)" });
      return;
    }

    // Decide if we should hit Tavily regardless of client hint
    const fresh = body.forceSearch === true || wantsFreshInfo(last);
    let context = "";
    if (fresh) {
      const sources = await tavilySearch(last);
      if (sources.length) context = "\n\nSources:\n" + sources.join("\n");
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      res.status(500).json({ error: "Missing OPENAI_API_KEY" });
      return;
    }

    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "America/Los_Angeles" });

    const payload = {
      model: process.env.CHAT_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: Number(process.env.RESPONSE_MAX_TOKENS || 700),
      messages: [
        {
          role: "system",
          content: [
            "You are GPT-5 for HomeRates.ai.",
            `Today is ${today} (America/Los_Angeles).`,
            "Output must be plain text. Short, clean paragraphs. Use '-' for bullets when helpful.",
            "If a 'Sources:' section is present in prior system messages, you MUST synthesize your answer from those sources, state the date when relevant, and avoid hedging.",
            "Do NOT say 'I can't provide real-time data'. If sources are missing but the user asked for 'today' or 'current', say you couldn't fetch live sources and suggest trying again.",
          ].join(" ")
        },
        ...messages,
        ...(context ? [{ role: "system", content: context }] : [])
      ]
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + OPENAI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    if (!r.ok) {
      res.status(r.status).json({ error: "Upstream error", detail: text.slice(0, 800) });
      return;
    }

    let j = {}; try { j = JSON.parse(text); } catch {}
    const reply = j?.choices?.[0]?.message?.content?.trim() || "";

    res.status(200).json({ reply });
  } catch (err) {
    console.error("chat.js crash", err);
    res.status(500).json({ error: "Chat crash", detail: String(err) });
  }
}