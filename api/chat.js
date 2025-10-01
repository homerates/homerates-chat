module.exports = async function (req, res) {
  try {
    // Basic body read (no dependencies)
    let raw = ""
    for await (const chunk of req) raw += chunk
    let body = {}
    try { body = raw ? JSON.parse(raw) : {} } catch {}
    res.status(200).json({
      reply: "stub-ok",
      sawMessages: Array.isArray(body?.messages),
      count: Array.isArray(body?.messages) ? body.messages.length : 0
    })
  } catch (e) {
    res.status(500).json({ error: "Stub crash", detail: String(e?.stack || e) })
  }
}