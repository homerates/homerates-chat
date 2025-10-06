export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok:false, error:"Method Not Allowed", method:req.method });
  }
  return res.status(200).json({ ok:true, project:"homerates-chat", method:req.method, time: Date.now() });
}
