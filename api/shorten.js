const shortCodeMemory = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const codeParam = urlObj.searchParams.get('c');

  if (req.method === 'GET' && codeParam) {
    const payload = shortCodeMemory.get(codeParam);
    if (!payload) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ payload }));
    return;
  }

  if (req.method === 'POST') {
    try {
      let bodyObj = {};
      if (req.body && typeof req.body === 'object') {
        bodyObj = req.body;
      } else {
        let raw = '';
        await new Promise((resolve, reject) => {
          req.on('data', (chunk) => {
            raw += chunk.toString();
          });
          req.on('end', resolve);
          req.on('error', reject);
        });
        bodyObj = JSON.parse(raw || '{}');
      }

      const targetUrl = String(bodyObj.url || '').trim();
      const payload = String(bodyObj.payload || '').trim();
      if (!targetUrl) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Missing url' }));
        return;
      }

      const code = Math.random().toString(36).slice(2, 8);
      if (payload) {
        shortCodeMemory.set(code, payload);
        if (shortCodeMemory.size > 500) {
          const oldest = shortCodeMemory.keys().next().value;
          if (oldest) shortCodeMemory.delete(oldest);
        }
      }

      // 1. Try clean direct-301 URL shortener (is.gd)
      if (/^https?:\/\//i.test(targetUrl) && !targetUrl.includes('localhost')) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2800);
          const resp = await fetch(
            `https://is.gd/create.php?format=simple&url=${encodeURIComponent(targetUrl)}`,
            { signal: controller.signal }
          );
          clearTimeout(timer);
          if (resp.ok) {
            const text = (await resp.text()).trim();
            if (text.startsWith('https://is.gd/')) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ shortUrl: text, code }));
              return;
            }
          }
        } catch {
          // Fall back to compact self-contained URL
        }
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ shortUrl: targetUrl, code }));
      return;
    } catch {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Shorten failed' }));
      return;
    }
  }

  res.statusCode = 405;
  res.end('Method not allowed');
}
