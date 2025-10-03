/**
 * api/search.js — Tavily search helper
 * Requires: TAVILY_API_KEY (set in Vercel)
 */
module.exports.search = async function tavilySearch(query, opts = {}) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("Missing TAVILY_API_KEY");

  const body = {
    api_key: key,
    query,
    search_depth: opts.search_depth || "basic",
    max_results: Math.min(Number(process.env.SEARCH_MAX_RESULTS || 5), 10),
    include_answer: true,
    include_raw_content: false,
    include_images: false
  };

  const r = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const text = await r.text();
  if (!r.ok) throw new Error(\Search upstream error: \ \\);

  const j = JSON.parse(text);
  const items = Array.isArray(j.results)
    ? j.results.map((x,i)=>({
        idx: i+1,
        title: x.title || x.url,
        url: x.url,
        snippet: (x.content || x.snippet || "").replace(/\s+/g," ").trim().slice(0,400)
      }))
    : [];

  return { answer: j.answer || "", items };
};