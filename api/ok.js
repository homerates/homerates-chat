const { json } = require('./_nodejson.js');
function handler(req, res) {
  json(res, 200, { ok: true, ping: 'pong', time: Date.now() });
}
module.exports = handler;
// Force Node runtime
module.exports.config = { runtime: 'nodejs18.x' };