...
module.exports = async (req, res) => {
  try{
    if (req.method !== 'POST') return json(res,405,{error:'Method not allowed'});

    let body = {};
    try { body = await readBody(req); }
    catch(e){ return json(res,400,{error:'Body parse failed', detail:String(e)}); }

    const msgs = Array.isArray(body?.messages) ? body.messages : null;
    if (!msgs?.length) {
      return json(res,400,{error:'Missing messages array', got: body});
    }

    const first = (msgs[0]?.content||'').trim().toLowerCase();
    if (first === 'ping') return json(res,200,{reply:'pong'});

    ...
  }catch(err){
    return json(res,500,{ error:'Function crash', detail:String(err?.stack||err) });
  }
};
module.exports.config = { runtime: 'nodejs18.x' };
