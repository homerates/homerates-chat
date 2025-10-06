// api/search.js — isolated Tavily search with guardrails

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
    if (!TAVILY_API_KEY) {
      return res.status(200).json({ sources: [], notes: "No Tavily key in env" });
    }

    const { query } = req.body || {};
    if (!query) {
      return res.status(400).json({ error: "Missing query" });
    }

    const resp = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + TAVILY_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        max_results: 3
      })
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: "Tavily upstream error", detail: text });
    }

    const data = await resp.json();
    const sources = (data.results || []).map(r => ({
      title: r.title,
      url: r.url
    }));

    res.status(200).json({ sources });
  } catch (err) {
    res.status(500).json({ error: "Search crash", detail: String(err) });
  }
}
