export default async function handler(req,res){
  res.status(200).json({ ok:true, now: Date.now(), project: 'homerates-chat', region: process.env.VERCEL_REGION || 'unknown' });
}