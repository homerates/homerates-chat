module.exports = async function (req, res) {
  res.status(200).json({ ok:true, project:'homerates-chat', version:'20250930-214828', host: req.headers.host || '' });
};