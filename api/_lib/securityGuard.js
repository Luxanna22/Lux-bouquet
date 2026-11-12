/**
 * Centralized Anti-Abuse, Anti-DDoS & API Security Guard for Serverless & Dev API Routes.
 * Provides:
 *  1. Sliding-window IP rate limiting with bounded memory (prevents brute-force, spam & DDoS floods)
 *  2. Stream byte-size limiter (`readSafeJsonBody`) to block memory-exhaustion payload attacks (HTTP 413)
 *  3. Deep JSON sanitizer (`sanitizeJsonValue`) blocking prototype pollution (`__proto__`, `constructor`),
 *     null-byte injection (`\0`), and deep-nesting CPU bombs
 *  4. Automated scanner & honeypot bot detection (`isSuspiciousBotRequest`)
 *  5. Hardened HTTP security headers (`applySecurityHeaders`)
 */

const rateLimitStore = new Map();
const MAX_RATE_LIMIT_KEYS = 5000;

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const SCANNER_UA_REGEX = /\b(sqlmap|nikto|masscan|zgrab|nuclei|dirbuster|gobuster|acunetix|nessus|nmap)\b/i;

/**
 * Extracts and normalizes the client IP address from standard proxy headers or socket.
 */
export function extractClientIp(req) {
  const headers = (req && req.headers) || {};
  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim().slice(0, 64);
  }
  const cfIp = headers['cf-connecting-ip'] || headers['x-real-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) {
    return cfIp.trim().slice(0, 64);
  }
  const remote = req?.socket?.remoteAddress || req?.connection?.remoteAddress || '127.0.0.1';
  return String(remote).slice(0, 64);
}

/**
 * Sliding-window rate limiter per IP + bucket key with bounded memory.
 */
export function checkRateLimit({
  ip = '127.0.0.1',
  bucket = 'default',
  maxRequests = 30,
  windowMs = 60_000,
  nowMs = Date.now(),
}) {
  const safeIp = String(ip || '127.0.0.1').slice(0, 64);
  const key = `${bucket}:${safeIp}`;

  // Periodic eviction when map grows large to prevent memory exhaustion from spoofed IPs
  if (rateLimitStore.size > MAX_RATE_LIMIT_KEYS) {
    for (const [k, entry] of rateLimitStore.entries()) {
      if (nowMs - entry.lastSeen > windowMs * 2) {
        rateLimitStore.delete(k);
      }
      if (rateLimitStore.size <= MAX_RATE_LIMIT_KEYS * 0.75) break;
    }
  }

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [], lastSeen: nowMs };
    rateLimitStore.set(key, record);
  }

  const windowStart = nowMs - windowMs;
  record.timestamps = record.timestamps.filter((t) => t > windowStart);
  record.lastSeen = nowMs;

  if (record.timestamps.length >= maxRequests) {
    const oldestInWindow = record.timestamps[0] || nowMs;
    const retryAfterSec = Math.max(1, Math.ceil((oldestInWindow + windowMs - nowMs) / 1000));
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec,
      resetAt: oldestInWindow + windowMs,
    };
  }

  record.timestamps.push(nowMs);
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - record.timestamps.length),
    retryAfterSec: 0,
    resetAt: nowMs + windowMs,
  };
}

/**
 * Clears the in-memory rate limit store (useful for deterministic unit tests).
 */
export function resetRateLimitStoreForTests() {
  rateLimitStore.clear();
}

/**
 * Sets standard hardened security headers on an HTTP response.
 */
export function applySecurityHeaders(res) {
  if (!res || typeof res.setHeader !== 'function') return;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), geolocation=(), usb=(), interest-cohort=()'
  );
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
}

/**
 * Recursively sanitizes parsed JSON values against prototype pollution, null bytes,
 * excessive nesting depth, and oversized strings.
 */
export function sanitizeJsonValue(value, depth = 0, maxStringLength = 50_000) {
  if (depth > 8) {
    return null;
  }
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'string') {
    // Strip null bytes and cap length
    return value.replace(/\0/g, '').slice(0, maxStringLength);
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    const capped = value.slice(0, 200);
    return capped.map((item) => sanitizeJsonValue(item, depth + 1, maxStringLength));
  }
  if (typeof value === 'object') {
    const cleanObj = {};
    const keys = Object.keys(value).slice(0, 100);
    for (const key of keys) {
      if (DANGEROUS_KEYS.has(key)) continue;
      const cleanKey = key.replace(/\0/g, '').slice(0, 120);
      cleanObj[cleanKey] = sanitizeJsonValue(value[key], depth + 1, maxStringLength);
    }
    return cleanObj;
  }
  return null;
}

/**
 * Detects automated vulnerability scanners or triggered bot honeypot fields.
 */
export function isSuspiciousBotRequest(req, body) {
  const ua = String(req?.headers?.['user-agent'] || '');
  if (ua && SCANNER_UA_REGEX.test(ua)) {
    return { suspicious: true, reason: 'automated_scanner_ua' };
  }
  if (body && typeof body === 'object') {
    const honeypotFields = ['_hp', 'website_url', 'company_fax', 'bot_trap'];
    for (const field of honeypotFields) {
      if (typeof body[field] === 'string' && body[field].trim().length > 0) {
        return { suspicious: true, reason: 'honeypot_triggered' };
      }
    }
  }
  return { suspicious: false, reason: null };
}

/**
 * Reads and parses a JSON request body with a strict byte limit to prevent payload DDoS.
 */
export async function readSafeJsonBody(req, maxBytes = 65_536) {
  if (!req) {
    return { ok: true, body: {} };
  }

  // Check Content-Length header upfront if present
  const contentLengthHeader = Number(req.headers?.['content-length'] || 0);
  if (Number.isFinite(contentLengthHeader) && contentLengthHeader > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: `Request payload exceeds the maximum allowed size (${Math.round(maxBytes / 1024)} KB).`,
    };
  }

  // If framework middleware already parsed req.body
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      if (Buffer.byteLength(req.body, 'utf8') > maxBytes) {
        return {
          ok: false,
          status: 413,
          error: `Request payload exceeds the maximum allowed size (${Math.round(maxBytes / 1024)} KB).`,
        };
      }
      try {
        const parsed = req.body.trim() ? JSON.parse(req.body) : {};
        return { ok: true, body: sanitizeJsonValue(parsed, 0, maxBytes) };
      } catch {
        return { ok: false, status: 400, error: 'Malformed JSON request body.' };
      }
    }
    if (typeof req.body === 'object') {
      const serializedLen = Buffer.byteLength(JSON.stringify(req.body), 'utf8');
      if (serializedLen > maxBytes) {
        return {
          ok: false,
          status: 413,
          error: `Request payload exceeds the maximum allowed size (${Math.round(maxBytes / 1024)} KB).`,
        };
      }
      return { ok: true, body: sanitizeJsonValue(req.body, 0, maxBytes) };
    }
  }

  // Stream reading with byte counter
  if (typeof req.on !== 'function') {
    return { ok: true, body: {} };
  }

  return new Promise((resolve) => {
    const chunks = [];
    let totalBytes = 0;
    let aborted = false;

    req.on('data', (chunk) => {
      if (aborted) return;
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      totalBytes += buf.length;
      if (totalBytes > maxBytes) {
        aborted = true;
        resolve({
          ok: false,
          status: 413,
          error: `Request payload exceeds the maximum allowed size (${Math.round(maxBytes / 1024)} KB).`,
        });
        return;
      }
      chunks.push(buf);
    });

    req.on('end', () => {
      if (aborted) return;
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({ ok: true, body: {} });
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        resolve({ ok: true, body: sanitizeJsonValue(parsed, 0, maxBytes) });
      } catch {
        resolve({ ok: false, status: 400, error: 'Malformed JSON request body.' });
      }
    });

    req.on('error', () => {
      if (!aborted) {
        aborted = true;
        resolve({ ok: false, status: 400, error: 'Failed to read request stream.' });
      }
    });
  });
}
