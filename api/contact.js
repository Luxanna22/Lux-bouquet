import { processContactSubmission } from './_lib/contactHandler.js';
import {
  applySecurityHeaders,
  checkRateLimit,
  extractClientIp,
  isSuspiciousBotRequest,
  readSafeJsonBody,
} from './_lib/securityGuard.js';

export default async function handler(req, res) {
  applySecurityHeaders(res);
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

  const clientIp = extractClientIp(req);
  const rateCheck = checkRateLimit({
    ip: clientIp,
    bucket: 'api_contact',
    maxRequests: 6,
    windowMs: 60_000,
  });
  res.setHeader('X-RateLimit-Remaining', String(rateCheck.remaining));
  if (!rateCheck.allowed) {
    res.statusCode = 429;
    res.setHeader('Retry-After', String(rateCheck.retryAfterSec));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        ok: false,
        error: 'Too many notes sent in a short time. Please wait a minute and try again.',
      })
    );
    return;
  }

  try {
    const parsedBody = await readSafeJsonBody(req, 24 * 1024);
    if (!parsedBody.ok) {
      res.statusCode = parsedBody.status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: parsedBody.error }));
      return;
    }

    const botCheck = isSuspiciousBotRequest(req, parsedBody.body);
    if (botCheck.suspicious) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          ok: false,
          error: 'Automated or suspicious request blocked by studio security.',
        })
      );
      return;
    }

    const result = await processContactSubmission(parsedBody.body);
    res.statusCode = result.statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(result.body));
  } catch {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        ok: false,
        error: 'Unable to send your note right now. Please try again or email hello@sendabouquet.online.',
      })
    );
  }
}

