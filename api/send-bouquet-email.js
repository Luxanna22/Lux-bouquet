import { processBouquetEmailDelivery } from './_lib/contactHandler.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }

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

    const result = await processBouquetEmailDelivery(bodyObj);
    res.statusCode = result.statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(result.body));
  } catch {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        ok: false,
        error: 'Unable to send surprise bouquet email right now. Please try again.',
      })
    );
  }
}
