// api/selftest.js
module.exports = async function (req, res) {
  try {
    const hasFetch = typeof fetch === 'function';
    const openai   = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 15;
    const tavily   = !!process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY.length > 10;
    const model    = process.env.CHAT_MODEL || 'gpt-4o-mini';
    const searchMax= process.env.SEARCH_MAX_RESULTS || '(default)';
    const respMax  = process.env.RESPONSE_MAX_TOKENS || '(default)';
    const vercelEnv= {
      ENV: process.env.VERCEL_ENV,
      REGION: process.env.VERCEL_REGION,
      RUNTIME: process.env.AWS_EXECUTION_ENV || '(unknown)'
    };
    res.status(200).json({
      ok: true,
      node: process.version,
      hasFetch,
      env: { openai, tavily, model, searchMax, respMax },
      vercel: vercelEnv,
      time: Date.now()
    });
  } catch (e) {
    res.status(500).json({ ok:false, error: String(e?.stack || e) });
  }
};