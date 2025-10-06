const VERSION = "chat.js v20251005-8";

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
  return /today|latest|this week|current|now|rate|rates|mortgage|fed|cpi|jobs|treasury|headline|market|yields?|inflation|news|update/.test(s);
}

function sanitizeSnippet(s = "") {
  return String(s).replace(/\s+/g, " ").trim();
}

function parseDateMaybe(d) {
  try { const t = Date.parse(d); return Number.isFinite(t) ? t : 0; } catch { return 0; }
}
function fmtDateISO(dstr) {
  const t = parseDateMaybe(dstr);
  if (!t) return "";
  const dt = new Date(t);
  return dt.toISOString().slice(0,10);
}

async function withTimeout(promise, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort("timeout"), ms);
  try {
    return await promise(ctrl.signal);
  } finally {
    clearTimeout(t);
  }
}

async function tavilySearchWithSnippets(query) {
  try {
    const key = process.env.TAVILY_API_KEY;
    if (!key) return { sources: [], context: "", ok: false, error: "no_key" };

    // Configurable recency + domains
    const days = Number(process.env.TAVILY_DAYS || 3);
    const includeDomains = (process.env.TAVILY_INCLUDE_DOMAINS || "")
      .split(",").map(s => s.trim()).filter(Boolean);

    const body = {
      api_key: key,                // <- body, not header
      query: query,
      topic: "news",               // <- force recency domain
      days: days,                  // <- recency bound
      search_depth: "advanced",
      max_results: 12,
      include_answer: true,
      include_raw_content: false,
      ...(includeDomains.length ? { include_domains: includeDomains } : {})
    };

    const resp = await withTimeout((signal) =>
      fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal
      })
    );

    if (!resp.ok) {
      const text = await resp.text().catch(()=>"");
      console.error("tavily non-OK", resp.status, text.slice(0, 200));
      return { sources: [], context: "", ok: false, error: "bad_status_" + resp.status };
    }

    const data = await resp.json().catch(()=>({}));
    const results = Array.isArray(data.results) ? data.results : [];

    // Sort by published_date desc; keep undated at bottom
    const sorted = results
      .map(r => ({ ...r, _t: parseDateMaybe(r.published_date) }))
      .sort((a,b) => (b._t - a._t));

    // Compact context block
    const lines = sorted.slice(0, 6).map(r => {
      const snippet = sanitizeSnippet(r.content || r.snippet || "");
      const d = fmtDateISO(r.published_date);
      const dateTag = d ? ` [${d}]` : "";
      return `• ${r.title}${dateTag}: ${snippet}`;
    });

    const sources = sorted.slice(0, 8).map(r => {
      const d = fmtDateISO(r.published_date);
      return `- ${r.title}${d ? ` [${d}]` : ""} (${r.url})`;
    });

    const context =
      (lines.length ? "Live web context:\n" + lines.join("\n") : "") +
      (sources.length ? "\n\nSources:\n" + sources.join("\n") : "");

    return { sources, context, ok: true };
  } catch (e) {
    console.error("tavilySearchWithSnippets fail", e);
    return { sources: [], context: "", ok: false, error: "exception" };
  }
}

function postFilter(text, hasSources) {
  if (!text) return "";
  let t = String(text);
  if (hasSources) {
    t = t.replace(/as of my last update[^.]*\.?\s*/gi, "");
    t = t.replace(/i (cannot|can't) provide real[- ]?time data[^.]*\.?\s*/gi, "");
    t = t.replace(/i don't have access to the internet[^.]*\.?\s*/gi, "");
    t = t.replace(/i couldn't fetch live sources[^.]*\.?\s*/gi, "");
  }
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  return t;
}

export default async function handler(req, res) {
  try {
    console.log(VERSION, "start", new Date().toISOString());
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    // no-store so we don't serve stale responses during dev
    res.setHeader("Cache-Control", "no-store");

    const body = await readBody(req);
    const messages = Array.isArray(body?.messages) ? body.messages : null;
    if (!messages?.length) return res.status(400).json({ error: "Missing messages array", got: body });

    const last = (messages[messages.length - 1]?.content || "").trim();
    if (last.toLowerCase() === "ping") {
      return res.status(200).json({ reply: "pong (esm+search)", meta: { version: VERSION } });
    }

    const forceSearch = body.forceSearch === true;
    const fresh = forceSearch || wantsFreshInfo(last);

    let meta = { fresh, tavily: false, sources: 0, version: VERSION };
    let sourcesBlock = "", contextBlock = "";

    if (fresh) {
      const { sources, context, ok } = await tavilySearchWithSnippets(last);
      meta.tavily = ok; meta.sources = sources.length;
      sourcesBlock = sources.length ? "\n\nSources:\n" + sources.join("\n") : "";
      contextBlock = context || "";
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
      timeZone: "America/Los_Angeles"
    });

    const instructions = [
      "You are GPT-5 for HomeRates.ai.",
      `Today is ${today} (America/Los_Angeles).`,
      "Output must be plain text. Short, clean paragraphs. Use '-' for bullets where helpful.",
      "If a 'Live web context' section is present, rely on that factual context to answer directly and concisely.",
      "If a 'Sources:' section is present, cite the key points in your own words and keep the list intact below your answer.",
      "Do NOT say you lack real-time data when sources are provided. If sources are empty and the user asked for 'today/current', say live sources couldn't be fetched right now and suggest retry."
    ].join(" ");

    const payload = {
      model: process.env.CHAT_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: Number(process.env.RESPONSE_MAX_TOKENS || 750),
      messages: [
        { role: "system", content: instructions },
        ...messages,
        ...(fresh && contextBlock ? [{ role: "system", content: contextBlock }] : []),
        ...(fresh && sourcesBlock ? [{ role: "system", content: sourcesBlock }] : [])
      ]
    };

    const r = await withTimeout((signal) =>
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + OPENAI_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal
      })
    , Number(process.env.OPENAI_TIMEOUT_MS || 20000));

    const text = await r.text();
    if (!r.ok) {
      return res.status(r.status).json({ error: "Upstream error", detail: text.slice(0, 800), meta });
    }

    let j = {}; try { j = JSON.parse(text); } catch {}
    let reply = j?.choices?.[0]?.message?.content?.trim() || "";
    reply = postFilter(reply, meta.sources > 0);

    if (fresh) {
      reply = `${today}\n\n${reply}${sourcesBlock ? sourcesBlock : ""}`;
    }

    return res.status(200).json({ reply, meta });
  } catch (err) {
    console.error("chat.js crash", err);
    return res.status(500).json({ error: "Chat crash", detail: String(err) });
  }
}
