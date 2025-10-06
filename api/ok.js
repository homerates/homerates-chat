const { json } = require('./_nodejson.js');
module.exports = (req, res) => json(res, 200, { ok:true, ping:'pong', time: Date.now() });
module.exports.config = { runtime: 'nodejs18.x' };