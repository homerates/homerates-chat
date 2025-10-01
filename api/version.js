module.exports = async function (req, res) {
  res.status(200).json({ ok:true, project:'homerates-chat', version:'20250930-220040', host: req.headers.host || '' });
};