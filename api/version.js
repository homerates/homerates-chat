module.exports = async function (req, res) {
  res.status(200).json({ ok:true, project:'homerates-chat', version:'20250930-215057', host: req.headers.host || '' });
};