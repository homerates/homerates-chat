function json(res, code, obj) {
  try {
    res.statusCode = code;
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
  } catch (e) {
    try { res.end('{"ok":false}'); } catch {}
  }
}
module.exports.json = json;