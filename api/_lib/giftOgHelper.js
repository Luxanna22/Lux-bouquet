import fs from 'node:fs';
import path from 'node:path';

const CANONICAL_ORIGIN = 'https://www.sendabouquet.online';
export const GIFT_OG_TITLE = 'Someone sent you a bouquet';
export const GIFT_OG_DESCRIPTION = 'Tap to unwrap.';
export const GIFT_OG_IMAGE_PATH = '/og-gift-bloom.png';

let cachedProductionIndexHtml = null;

function escapeHtmlAttr(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function resolveRequestOrigin(req) {
  const hostHeader = String(
    req?.headers?.['x-forwarded-host'] || req?.headers?.host || ''
  )
    .split(',')[0]
    .trim();
  if (!hostHeader || hostHeader.includes('localhost') || hostHeader.startsWith('127.')) {
    return CANONICAL_ORIGIN;
  }
  const protoHeader = String(req?.headers?.['x-forwarded-proto'] || 'https')
    .split(',')[0]
    .trim();
  const proto = protoHeader === 'http' ? 'http' : 'https';
  return `${proto}://${hostHeader}`;
}

export function injectGiftOpenGraphMeta(baseHtml, { giftUrl, imageUrl }) {
  const safeTitle = escapeHtmlAttr(GIFT_OG_TITLE);
  const safeDesc = escapeHtmlAttr(GIFT_OG_DESCRIPTION);
  const safeGiftUrl = escapeHtmlAttr(giftUrl);
  const safeImageUrl = escapeHtmlAttr(imageUrl);
  const safeImageAlt = escapeHtmlAttr(`${GIFT_OG_TITLE} — ${GIFT_OG_DESCRIPTION}`);

  let html = String(baseHtml || '');

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  html = html.replace(
    /<link\s+[^>]*rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${safeGiftUrl}" id="canonical-link" />`
  );
  html = html.replace(
    /<meta\s+[^>]*name=["']robots["'][^>]*>/i,
    `<meta name="robots" content="noindex, nofollow" id="robots-meta" />`
  );
  html = html.replace(
    /<meta\s+[^>]*name=["']googlebot["'][^>]*>/i,
    `<meta name="googlebot" content="noindex, nofollow" />`
  );
  html = html.replace(
    /<meta\s+[^>]*name=["']description["'][^>]*>/i,
    `<meta name="description" content="${safeDesc}" />`
  );

  const ogBlock = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Send A Bouquet" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:url" content="${safeGiftUrl}" id="og-url-meta" />`,
    `<meta property="og:title" content="${safeTitle}" id="og-title-meta" />`,
    `<meta property="og:description" content="${safeDesc}" id="og-desc-meta" />`,
    `<meta property="og:image" content="${safeImageUrl}" />`,
    `<meta property="og:image:secure_url" content="${safeImageUrl}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${safeImageAlt}" />`,
  ].join('\n    ');

  html = html.replace(
    /<meta\s+property=["']og:type["'][\s\S]*?<meta\s+property=["']og:image:alt["'][^>]*>/i,
    ogBlock
  );

  const twitterBlock = [
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:url" content="${safeGiftUrl}" />`,
    `<meta name="twitter:title" content="${safeTitle}" />`,
    `<meta name="twitter:description" content="${safeDesc}" />`,
    `<meta name="twitter:image" content="${safeImageUrl}" />`,
    `<meta name="twitter:image:alt" content="${safeImageAlt}" />`,
  ].join('\n    ');

  html = html.replace(
    /<meta\s+name=["']twitter:card["'][\s\S]*?<meta\s+name=["']twitter:image:alt["'][^>]*>/i,
    twitterBlock
  );

  return html;
}

function buildStandaloneGiftCrawlerHtml({ giftUrl, imageUrl }) {
  const safeTitle = escapeHtmlAttr(GIFT_OG_TITLE);
  const safeDesc = escapeHtmlAttr(GIFT_OG_DESCRIPTION);
  const safeGiftUrl = escapeHtmlAttr(giftUrl);
  const safeImageUrl = escapeHtmlAttr(imageUrl);
  const safeImageAlt = escapeHtmlAttr(`${GIFT_OG_TITLE} — ${GIFT_OG_DESCRIPTION}`);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}" />
    <meta name="robots" content="noindex, nofollow" />
    <link rel="canonical" href="${safeGiftUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Send A Bouquet" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:url" content="${safeGiftUrl}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:image" content="${safeImageUrl}" />
    <meta property="og:image:secure_url" content="${safeImageUrl}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${safeImageAlt}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${safeGiftUrl}" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${safeImageUrl}" />
    <meta name="twitter:image:alt" content="${safeImageAlt}" />
  </head>
  <body></body>
</html>`;
}

async function loadBaseSpaHtml(origin) {
  if (cachedProductionIndexHtml) {
    return cachedProductionIndexHtml;
  }

  try {
    const distPath = path.join(process.cwd(), 'dist', 'index.html');
    if (fs.existsSync(distPath)) {
      const content = fs.readFileSync(distPath, 'utf-8');
      if (content && content.includes('<div id="root">')) {
        cachedProductionIndexHtml = content;
        return content;
      }
    }
  } catch {
    // Fall through to CDN fetch
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(`${origin}/`, {
      method: 'GET',
      headers: { Accept: 'text/html' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (resp.ok) {
      const text = await resp.text();
      if (text && text.includes('<div id="root">')) {
        cachedProductionIndexHtml = text;
        return text;
      }
    }
  } catch {
    // Fall through to local index.html
  }

  try {
    const srcIndexPath = path.join(process.cwd(), 'index.html');
    if (fs.existsSync(srcIndexPath)) {
      return fs.readFileSync(srcIndexPath, 'utf-8');
    }
  } catch {
    // Ignore
  }

  return null;
}

export async function serveGiftOpenGraphHtml(req, res, rawCode = '') {
  const safeCode = String(rawCode || '').replace(/[^0-9A-Za-z_-]/g, '').slice(0, 24);
  const origin = resolveRequestOrigin(req);
  const giftUrl = safeCode ? `${origin}/${safeCode}` : `${origin}/`;
  const imageUrl = `${origin}${GIFT_OG_IMAGE_PATH}`;

  const baseHtml = await loadBaseSpaHtml(origin);
  const html = baseHtml
    ? injectGiftOpenGraphMeta(baseHtml, { giftUrl, imageUrl })
    : buildStandaloneGiftCrawlerHtml({ giftUrl, imageUrl });

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
  res.end(html);
}
