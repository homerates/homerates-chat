module.exports = async function (req, res) {
  res.status(200).json({ reply: "hello-world", method: req.method });
};