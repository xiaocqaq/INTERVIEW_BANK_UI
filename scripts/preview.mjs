import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../dist')
const portArg = process.argv.indexOf('--port')
const port = Number(process.env.PORT || (portArg >= 0 ? process.argv[portArg + 1] : 4173))
const target = new URL(process.env.PROXY_TARGET || 'http://127.0.0.1:8650')
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname.startsWith('/api/')) {
    const upstream = http.request(new URL(req.url, target), { method: req.method, headers: { ...req.headers, host: target.host } }, response => { res.writeHead(response.statusCode, response.headers); response.pipe(res) })
    upstream.on('error', () => { res.writeHead(502, { 'content-type': 'application/json' }); res.end('{"error":"后端不可用"}') })
    req.pipe(upstream); return
  }
  try {
    const pathname = decodeURIComponent(url.pathname)
    const asset = pathname.startsWith('/static/')
    const file = resolve(root, '.' + (asset ? pathname.slice(7) : pathname))
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end(); return }
    let body, extension = extname(file)
    try { if (!(await stat(file)).isFile()) throw new Error('directory'); body = await readFile(file) }
    catch { if (asset || extension) { res.writeHead(404); res.end(); return }; body = await readFile(resolve(root, 'index.html')); extension = '.html' }
    res.writeHead(200, { 'content-type': types[extension] || 'application/octet-stream', 'cache-control': 'no-cache' }); res.end(body)
  } catch { res.writeHead(400); res.end() }
}).listen(port, '127.0.0.1', () => console.log('Production preview: http://127.0.0.1:' + port))
