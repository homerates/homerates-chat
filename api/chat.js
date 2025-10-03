export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { messages = [], forceSearch = false } = req.body || {};
    const last = messages[messages.length - 1]?.content || "";

    // Simple echo behavior
    if (last.toLowerCase().trim() === "ping") {
      return res.status(200).json({ reply: "pong (minimal handler v1)" });
    }

    return res.status(200).json({
      reply: `You said: "${last}" (forceSearch=${forceSearch})`,
    });
  } catch (err) {
    console.error("chat.js crash", err);
    return res.status(500).json({ error: "Server error", detail: err.message });
  }
}

