// Zero-dependency Node.js server: serves the frontend and a small JSON API.
// Run: node server.js   (optional: ADMIN_KEY=secret PORT=3000)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const FRONTEND = path.join(__dirname, '..', 'frontend');
const DATA = path.join(__dirname, 'data');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

const readJSON = (f, fallback) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch { return fallback; } };
const writeJSON = (f, v) => fs.writeFileSync(path.join(DATA, f), JSON.stringify(v, null, 2));

const send = (res, code, body, headers = {}) => {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(code, { 'Content-Type': isObj ? 'application/json' : 'text/plain', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(isObj ? JSON.stringify(body) : body);
};

// simple in-memory rate limit: 5 messages / 10 min / IP
const hits = new Map();
const limited = (ip) => {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 600000);
  list.push(now); hits.set(ip, list);
  return list.length > 5;
};

const readBody = (req) => new Promise((resolve, reject) => {
  let raw = '';
  req.on('data', (c) => { raw += c; if (raw.length > 10000) { reject(new Error('Too large')); req.destroy(); } });
  req.on('end', () => resolve(raw));
  req.on('error', reject);
});

async function api(req, res, pathname) {
  if (pathname === '/api/projects' && req.method === 'GET') return send(res, 200, readJSON('projects.json', []));

  if (pathname === '/api/contact' && req.method === 'POST') {
    if (limited(req.socket.remoteAddress)) return send(res, 429, { error: 'Too many messages. Try again later.' });
    let body;
    try { body = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: 'Invalid request.' }); }
    if (body.website) return send(res, 200, { ok: true }); // honeypot: bots fill this
    const name = String(body.name || '').trim().slice(0, 80);
    const email = String(body.email || '').trim().slice(0, 120);
    const message = String(body.message || '').trim().slice(0, 2000);
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || !message) return send(res, 400, { error: 'Please complete all fields with a valid email.' });
    const all = readJSON('messages.json', []);
    all.push({ id: Date.now(), name, email, message, date: new Date().toISOString() });
    writeJSON('messages.json', all);
    return send(res, 201, { ok: true });
  }

  if (pathname === '/api/messages' && req.method === 'GET') {
    if (!ADMIN_KEY || req.headers['x-admin-key'] !== ADMIN_KEY) return send(res, 401, { error: 'Unauthorized' });
    return send(res, 200, readJSON('messages.json', []));
  }
  return send(res, 404, { error: 'Not found' });
}

http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname.startsWith('/api/')) return await api(req, res, pathname);
    const file = path.normalize(path.join(FRONTEND, pathname === '/' ? 'index.html' : pathname));
    if (!file.startsWith(FRONTEND)) return send(res, 403, 'Forbidden');
    fs.readFile(file, (err, buf) => {
      if (err) return send(res, 404, 'Not found');
      send(res, 200, buf, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    });
  } catch { send(res, 500, { error: 'Server error' }); }
}).listen(PORT, () => console.log(`Portfolio running at http://localhost:${PORT}`));