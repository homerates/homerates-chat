export default async function handler(req,res){
  if(req.method!=='POST'){res.status(405).json({error:'Method not allowed'});return;}
  try{
    const {messages}=req.body||{};
    if(!Array.isArray(messages)||!messages.length){res.status(400).json({error:'Missing messages array'});return;}
    const apiKey=process.env.OPENAI_API_KEY;
    if(!apiKey){res.status(500).json({error:'Server not configured: missing OPENAI_API_KEY'});return;}

    const policy=[{role:'system',content:'Safety/compliance: educational only; no legal/tax advice; assume California unless specified; when uncertain, state assumptions and offer options.'}];
    const payload={
      model:process.env.CHAT_MODEL||'gpt-4o-mini',
      messages:[...policy,...messages],
      temperature:0.4, top_p:0.9, max_tokens:Number(process.env.RESPONSE_MAX_TOKENS||600)
    };

    const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:Bearer \,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!r.ok){res.status(r.status).json({error:'Upstream error',detail:(await r.text()).slice(0,1000)});return;}
    const j=await r.json();
    res.status(200).json({reply:j?.choices?.[0]?.message?.content?.trim()||''});
  }catch(e){
    res.status(500).json({error:'Server failure',detail:String(e)});
  }
}