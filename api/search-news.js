// api/search-news.js  (CommonJS; works without "type":"module")
const cutoffDays = 3; // tweak to 1–7 as needed

module.exports = async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    // accept q from query or body
    let q = (req.query && req.query.q) || "";
    if (!q && req.body) {
      try { q = (typeof req.body === "string" ? JSON.parse(req.body) : req.body).q || ""; } catch {}
    }
    if (!q) q = "mortgage rates today";

    const body = {
      api_key: process.env.TAVILY_API_KEY,
      query: q,
      topic: "news",            // <- force news freshness
      days: cutoffDays,         // <- hard recency bound
      search_depth: "advanced", // <- better recall + freshness
      max_results: 12,
      include_answer: true,
      include_raw_content: false
      // Optional: include_domains: ["mortgagenewsdaily.com","reuters.com","wsj.com","bls.gov","cmegroup.com"]
    };

    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // No client-side cache:
      cache: "no-store"
    });

    const data = await r.json();

    // post-filter & sort by published_date
    const cutoff = Date.now() - cutoffDays * 24 * 60 * 60 * 1000;
    const results = (data.results || [])
      .map(x => ({ ...x, _t: x.published_date ? Date.parse(x.published_date) : 0 }))
      .filter(x => (x._t ? x._t >= cutoff : true)) // keep undated, but rank lower
      .sort((a, b) => b._t - a._t);

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      query: q,
      answer: data.answer ?? null,
      count: results.length,
      results
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
};
