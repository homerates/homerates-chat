export default async function handler(req,res){
  if(req.method!=='POST'){res.status(405).json({error:'Method not allowed'});return;}
  try{
    const {messages}=req.body||{};
    if(!Array.isArray(messages)){res.status(400).json({error:'Missing messages'});return;}
    const apiKey=process.env.OPENAI_API_KEY;
    if(!apiKey){res.status(500).json({error:'No API key'});return;}
    const payload={model:process.env.CHAT_MODEL||'gpt-4o-mini',messages,temperature:0.4,max_tokens:600};
    const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:Bearer \,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!r.ok){res.status(r.status).json({error:'Upstream',detail:await r.text()});return;}
    const j=await r.json();
    res.status(200).json({reply:j?.choices?.[0]?.message?.content?.trim()||''});
  }catch(e){res.status(500).json({error:'Server fail',detail:String(e)})}
}