import fs from 'fs/promises';
import http from 'http';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || '127.0.0.1';

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.eot': 'application/vnd.ms-fontobject',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function getSafeFilePath(pathname) {
  const requested = path.join(distDir, pathname === '/' ? 'index.html' : pathname);
  const relative = path.relative(distDir, requested);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return path.join(distDir, 'index.html');
  }

  return requested;
}

async function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const data = await fs.readFile(filePath);

  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const filePath = getSafeFilePath(decodeURIComponent(url.pathname));

    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        await sendFile(res, filePath);
        return;
      }
    } catch {
      await sendFile(res, path.join(distDir, 'index.html'));
      return;
    }

    await sendFile(res, path.join(distDir, 'index.html'));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ message: 'Frontend server error', error: err.message }));
  }
});

server.listen(port, host, () => {
  console.log(`RideFlow frontend is running at http://${host}:${port}`);
});
