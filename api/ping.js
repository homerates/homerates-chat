module.exports = async function (req, res) {
  res.status(200).json({ ok: true, now: Date.now(), project: 'homerates-chat' });
};