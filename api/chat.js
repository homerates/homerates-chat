const VERSION = "chat.js v20251003-6";

// ----- helpers -----
async function readBody(req) {
  return new Promise((resolve) => {
    try {
      if (req.body && typeof req.body === "object") return resolve(req.body);
      let raw = ""; req.on("data", c => raw += c);
      req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } });
    } catch { resolve({}); }
  });
}

function wantsFreshInfo(text) {
  const s = (text || "").toLowerCase();
  return /today|latest|this week|current|now|rate|rates|mortgage|fed|cpi|jobs|treasury|headline|market/.test(s);
}

async function tavilySearch(query) {
  try {
    const key = process.env.TAVILY_API_KEY;
    if (!key) return { sources: [], ok: false, error: "no_key" };
    const resp = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ query, max_results: 4 })
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error("tavily non-OK", resp.status, text.slice(0,200));
      return { sources: [], ok: false, error: "bad_status_"+resp.status };
    }
    const data = await resp.json();
    const sources = Array.isArray(data.results) ? data.results.map(r => `- ${r.title} (${r.url})`) : [];
    return { sources, ok: true };
  } catch (e) {
    console.error("tavilySearch fail", e);
    return { sources: [], ok: false, error: "exception" };
  }
}

function postFilter(text) {
  if (!text) return "";
  let t = String(text);
  // Remove common stale disclaimers
  t = t.replace(/as of my last update[^.]*\.?\s*/gi, "");
  t = t.replace(/i (cannot|can't) provide real[- ]?time data[^.]*\.?\s*/gi, "");
  t = t.replace(/i don't have access to the internet[^.]*\.?\s*/gi, "");
  // Trim excessive blank lines
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  return t;
}

export default async function handler(req, res) {
  try {
    console.log(VERSION, "start", new Date().toISOString());
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const body = await readBody(req);
    const messages = Array.isArray(body?.messages) ? body.messages : null;
    if (!messages?.length) return res.status(400).json({ error: "Missing messages array", got: body });

    const last = (messages[messages.length - 1]?.content || "").trim();
    if (last.toLowerCase() === "ping") return res.status(200).json({ reply: "pong (esm+search)", meta: { version: VERSION } });

    const fresh = body.forceSearch === true || wantsFreshInfo(last);
    let context = ""; let meta = { fresh, tavily: false, sources: 0, version: VERSION };

    if (fresh) {
      const { sources, ok } = await tavilySearch(last);
      meta.tavily = ok; meta.sources = sources.length;
      if (sources.length) context = "\n\nSources:\n" + sources.join("\n");
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "America/Los_Angeles" });

    const system = [
      "You are GPT-5 for HomeRates.ai.",
      `Today is ${today} (America/Los_Angeles).`,
      "Output must be plain text. Short, clean paragraphs. Use '-' for bullets if useful.",
      "If a Sources section is provided, synthesize the answer using those sources and state the relevant date plainly.",
      "Do not say you lack real-time data. If sources are empty but the user asked for 'today/current', say you couldn't fetch live sources right now and suggest retry."
    ].join(" ");

    const payload = {
      model: process.env.CHAT_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: Number(process.env.RESPONSE_MAX_TOKENS || 700),
      messages: [
        { role: "system", content: system },
        ...messages,
        ...(context ? [{ role: "system", content: context }] : [])
      ]
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + OPENAI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    if (!r.ok) return res.status(r.status).json({ error: "Upstream error", detail: text.slice(0,800), meta });

    let j = {}; try { j = JSON.parse(text); } catch {}
    let reply = j?.choices?.[0]?.message?.content?.trim() || "";
    reply = postFilter(reply);

    // Stamp date on fresh answers
    if (fresh) reply = `${today}\n\n${reply}${context ? context : ""}`;

    return res.status(200).json({ reply, meta });
  } catch (err) {
    console.error("chat.js crash", err);
    return res.status(500).json({ error: "Chat crash", detail: String(err) });
  }
}