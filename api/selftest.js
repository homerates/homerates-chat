const { json } = require('./_nodejson.js');
module.exports = async (req, res) => {
  try {
    json(res, 200, {
      ok: true,
      node: process.version,
      hasFetch: (typeof fetch === 'function'),
      env: {
        openai: !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length>15,
        tavily: !!process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY.length>10,
        model: process.env.CHAT_MODEL || 'gpt-4o-mini',
        searchMax: process.env.SEARCH_MAX_RESULTS || '(default)',
        respMax: process.env.RESPONSE_MAX_TOKENS || '(default)'
      },
      vercel: {
        ENV: process.env.VERCEL_ENV,
        REGION: process.env.VERCEL_REGION,
        RUNTIME: process.env.AWS_EXECUTION_ENV || '(unknown)'
      },
      time: Date.now()
    });
  } catch (e) {
    json(res, 500, { ok:false, error: String(e?.stack||e) });
  }
};
module.exports.config = { runtime: 'nodejs18.x' };