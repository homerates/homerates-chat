module.exports = (req, res) => {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  res.status(200).send('pong');
};

