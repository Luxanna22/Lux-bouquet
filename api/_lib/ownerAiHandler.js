import crypto from 'node:crypto';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const GEMINI_MODEL = 'gemini-4-hydrogen';
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 80;
const RATE_WINDOW_MS = 60 * 1000;
const MAX_LIVE_CALLS_PER_WINDOW = 10;
const COOLDOWN_AFTER_429_MS = 45 * 1000;

const AI_RESPONSE_CACHE = new Map();
const ADMIN_RATE_TRACKER = new Map();
let upstreamCooldownUntilMs = 0;

function stripSensitivePatterns(rawText) {
  return String(rawText || '')
    .replace(/BLOOM-[A-Z0-9]{4}-[A-Z0-9]{4}/gi, '[REDACTED_KEY]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/gk-[A-Za-z0-9_-]{12,}/g, '[REDACTED_GATE]')
    .trim();
}

function topNMap(map, limit = 5) {
  if (!map || typeof map !== 'object') return [];
  return Object.entries(map)
    .map(([key, val]) => [stripSensitivePatterns(key).slice(0, 32), Number(val) || 0])
    .filter(([key, val]) => key && val > 0 && !key.includes('[REDACTED'))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function safeInt(val) {
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

/**
 * Strictly allowlists non-sensitive, aggregated product & financial metrics.
 * Never reads or emits pass keys, emails, device hashes, PINs, tokens, or event logs.
 */
export function sanitizeAnalyticsForAi(analytics, phpPerUsd = 56) {
  const src = analytics && typeof analytics === 'object' ? analytics : {};
  const passes = src.passesIssued && typeof src.passesIssued === 'object' ? src.passesIssued : {};
  const regions = src.regions && typeof src.regions === 'object' ? src.regions : {};
  const devices = src.devices && typeof src.devices === 'object' ? src.devices : {};
  const referrers = src.referrers && typeof src.referrers === 'object' ? src.referrers : {};
  const shareChannels =
    src.shareChannels && typeof src.shareChannels === 'object' ? src.shareChannels : {};

  const webVisits = safeInt(src.webVisits);
  const uniqueVisitors = safeInt(src.uniqueVisitors);
  const studioSessions = safeInt(src.studioSessions);
  const bouquetsCreated = safeInt(src.bouquetsCreated);
  const coutureBouquetsCreated = safeInt(src.coutureBouquetsCreated);
  const freeBouquetsCreated = safeInt(src.freeBouquetsCreated);
  const recipientUnwraps = safeInt(src.recipientUnwraps);
  const recipientToStudioClicks = safeInt(src.recipientToStudioClicks);
  const paywallOpens = safeInt(src.paywallOpens);
  const checkoutsStarted = safeInt(src.checkoutsStarted);

  const singleIssued = safeInt(passes.single);
  const pass7dIssued = safeInt(passes.pass_7d);
  const pass30dIssued = safeInt(passes.pass_30d);
  const testerIssued = safeInt(passes.tester);
  const paidPassesTotal = singleIssued + pass7dIssued + pass30dIssued;

  const revenueUsdCents = safeInt(src.revenueUsdCents);
  const revenuePhpCentavos = safeInt(src.revenuePhpCentavos);
  const combinedGrossUsd = Number(
    (revenueUsdCents / 100 + revenuePhpCentavos / 100 / phpPerUsd).toFixed(2)
  );
  const combinedGrossPhp = Number(
    (revenuePhpCentavos / 100 + (revenueUsdCents / 100) * phpPerUsd).toFixed(2)
  );

  const dailySeries = Array.isArray(src.dailySeries)
    ? src.dailySeries.slice(-14).map((d) => ({
        date: String(d?.date || '').slice(0, 10),
        visits: safeInt(d?.visits),
        studioSessions: safeInt(d?.studioSessions),
        bouquetsSealed: safeInt(d?.bouquetsSealed),
        recipientUnwraps: safeInt(d?.recipientUnwraps),
        passUnlocks: safeInt(d?.passUnlocks),
        revenuePhp: Number((safeInt(d?.revenuePhpCentavos) / 100).toFixed(2)),
        revenueUsd: Number((safeInt(d?.revenueUsdCents) / 100).toFixed(2)),
      }))
    : [];

  return {
    funnel: {
      webVisits,
      uniqueVisitors,
      landingViews: safeInt(src.landingViews),
      studioSessions,
      showcaseViews: safeInt(src.showcaseViews),
      bouquetsCreated,
      coutureBouquetsCreated,
      freeBouquetsCreated,
      recipientUnwraps,
      reactionsSent: safeInt(src.reactionsSent),
      repliesSent: safeInt(src.repliesSent),
      voiceNotesRecorded: safeInt(src.voiceNotesRecorded),
      voicePlays: safeInt(src.voicePlays),
      recipientToStudioClicks,
      paywallOpens,
      checkoutsStarted,
      paidPassesTotal,
    },
    ratesPct: {
      visitToStudioPct:
        webVisits > 0 ? Number(((studioSessions / webVisits) * 100).toFixed(1)) : 0,
      studioToSealedPct:
        studioSessions > 0 ? Number(((bouquetsCreated / studioSessions) * 100).toFixed(1)) : 0,
      coutureSharePct:
        bouquetsCreated > 0
          ? Number(((coutureBouquetsCreated / bouquetsCreated) * 100).toFixed(1))
          : 0,
      paywallToCheckoutPct:
        paywallOpens > 0 ? Number(((checkoutsStarted / paywallOpens) * 100).toFixed(1)) : 0,
      paywallToPaidPct:
        paywallOpens > 0 ? Number(((paidPassesTotal / paywallOpens) * 100).toFixed(1)) : 0,
      visitorToPaidPct:
        webVisits > 0 ? Number(((paidPassesTotal / webVisits) * 100).toFixed(2)) : 0,
      viralLoopClickRatePct:
        recipientUnwraps > 0
          ? Number(((recipientToStudioClicks / recipientUnwraps) * 100).toFixed(1))
          : 0,
    },
    monetization: {
      revenueUsd: Number((revenueUsdCents / 100).toFixed(2)),
      revenuePhp: Number((revenuePhpCentavos / 100).toFixed(2)),
      combinedGrossUsd,
      combinedGrossPhp,
      pricingCatalog: {
        PH: { singlePhp: 49, pass7dPhp: 99, pass30dPhp: 199 },
        INTL: { singleUsd: 2.99, pass7dUsd: 4.99, pass30dUsd: 8.99 },
      },
      passesIssued: {
        single: singleIssued,
        pass_7d: pass7dIssued,
        pass_30d: pass30dIssued,
        tester: testerIssued,
      },
    },
    audience: {
      regions: {
        PH: safeInt(regions.PH),
        INTL: safeInt(regions.INTL),
      },
      devices: {
        mobile: safeInt(devices.mobile),
        tablet: safeInt(devices.tablet),
        desktop: safeInt(devices.desktop),
      },
      referrers: {
        direct: safeInt(referrers.direct),
        recipient_viral: safeInt(referrers.recipient_viral),
        social: safeInt(referrers.social),
        qr_scan: safeInt(referrers.qr_scan),
        search: safeInt(referrers.search),
        tester_magic_link: safeInt(referrers.tester_magic_link),
      },
      shareChannels: {
        short_link: safeInt(shareChannels.short_link),
        png_download: safeInt(shareChannels.png_download),
        qr_card: safeInt(shareChannels.qr_card),
        email_surprise: safeInt(shareChannels.email_surprise),
        garland_pin: safeInt(shareChannels.garland_pin),
      },
    },
    topStyles: {
      flowers: topNMap(src.flowers, 5),
      wraps: topNMap(src.wraps, 4),
      ribbons: topNMap(src.ribbons, 4),
      environments: topNMap(src.environments, 4),
      paywallTriggers: topNMap(src.paywallTriggers, 5),
    },
    dailySeries14d: dailySeries,
  };
}

export function computeAnalyticsSnapshotHash(sanitizedSnapshot) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(sanitizedSnapshot), 'utf8')
    .digest('hex')
    .slice(0, 16);
}

function getDefaultGeminiClient(apiKey) {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function pruneCache(nowMs) {
  for (const [k, entry] of AI_RESPONSE_CACHE.entries()) {
    if (!entry || nowMs - entry.createdAtMs > CACHE_TTL_MS) {
      AI_RESPONSE_CACHE.delete(k);
    }
  }
  while (AI_RESPONSE_CACHE.size > MAX_CACHE_ENTRIES) {
    const oldestKey = AI_RESPONSE_CACHE.keys().next().value;
    if (!oldestKey) break;
    AI_RESPONSE_CACHE.delete(oldestKey);
  }
}

function checkAdminAiRateLimit(adminKey, nowMs) {
  const bucketKey = String(adminKey || 'owner_default').slice(0, 64);
  const existing = ADMIN_RATE_TRACKER.get(bucketKey) || [];
  const active = existing.filter((ts) => nowMs - ts < RATE_WINDOW_MS);
  if (active.length >= MAX_LIVE_CALLS_PER_WINDOW) {
    const oldest = active[0];
    const retryAfterSec = Math.max(1, Math.ceil((RATE_WINDOW_MS - (nowMs - oldest)) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec };
  }
  return {
    allowed: true,
    remaining: Math.max(0, MAX_LIVE_CALLS_PER_WINDOW - active.length),
    retryAfterSec: 0,
  };
}

function recordAdminAiCall(adminKey, nowMs) {
  const bucketKey = String(adminKey || 'owner_default').slice(0, 64);
  const existing = ADMIN_RATE_TRACKER.get(bucketKey) || [];
  const active = existing.filter((ts) => nowMs - ts < RATE_WINDOW_MS);
  active.push(nowMs);
  ADMIN_RATE_TRACKER.set(bucketKey, active);
  return Math.max(0, MAX_LIVE_CALLS_PER_WINDOW - active.length);
}

export function resetOwnerAiStateForTests() {
  AI_RESPONSE_CACHE.clear();
  ADMIN_RATE_TRACKER.clear();
  upstreamCooldownUntilMs = 0;
}

const SYSTEM_INSTRUCTION = [
  'You are the private business and revenue analyst for "Send A Bouquet", a custom digital floral gifting studio.',
  'Audience: the studio owner and prospective business buyers evaluating traction, unit economics, and monetization upside.',
  'Strict Data Rules:',
  '- Ground every claim strictly in the provided sanitized JSON metrics snapshot.',
  '- Never fabricate numbers or claim revenue that is zero. If live counters are low or zero, state that clearly and walk through realistic sensitivity math using the live PH (₱49 / ₱99 / ₱199) and INTL ($2.99 / $4.99 / $8.99) catalog prices.',
  '- Never ask for or output secrets, pass keys, personal emails, or raw device tokens.',
  'Response Style:',
  '- Concise, scannable, plain executive prose with short bullet points (max ~220 words unless a detailed breakdown is explicitly asked).',
  '- Lead with the sharpest insight, highlight the #1 bottleneck or upside lever, and give 1-2 concrete next moves.',
].join('\n');

export async function runOwnerAnalyticsAi({
  analytics,
  mode = 'question',
  question = '',
  history = [],
  adminKey = 'owner',
  nowMs = Date.now(),
  apiKeyOverride,
  clientFactory = getDefaultGeminiClient,
}) {
  const sanitized = sanitizeAnalyticsForAi(analytics);
  const snapshotHash = computeAnalyticsSnapshotHash(sanitized);

  const normalizedMode = mode === 'overview' ? 'overview' : 'question';
  const cleanQuestion =
    normalizedMode === 'overview'
      ? 'Provide a crisp executive overview: current traction, monetization mix, top funnel bottleneck, and what happens to revenue as traffic scales.'
      : stripSensitivePatterns(String(question || '')).slice(0, 500);

  if (!cleanQuestion) {
    return {
      ok: false,
      statusCode: 400,
      code: 'EMPTY_QUESTION',
      message: 'Please enter a question about your analytics or revenue.',
    };
  }

  const boundedHistory = Array.isArray(history)
    ? history
        .slice(-4)
        .map((turn) => ({
          role: turn?.role === 'assistant' ? 'assistant' : 'user',
          text: stripSensitivePatterns(String(turn?.text || '')).slice(0, 400),
        }))
        .filter((turn) => turn.text.length > 0)
    : [];

  pruneCache(nowMs);
  const cacheDigest = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        snapshotHash,
        mode: normalizedMode,
        q: cleanQuestion.toLowerCase(),
        h: boundedHistory,
      }),
      'utf8'
    )
    .digest('hex');

  const cachedEntry = AI_RESPONSE_CACHE.get(cacheDigest);
  if (cachedEntry && nowMs - cachedEntry.createdAtMs <= CACHE_TTL_MS) {
    const rateInfo = checkAdminAiRateLimit(adminKey, nowMs);
    return {
      ok: true,
      statusCode: 200,
      answer: cachedEntry.answer,
      cached: true,
      snapshotHash,
      cooldownSec:
        upstreamCooldownUntilMs > nowMs
          ? Math.ceil((upstreamCooldownUntilMs - nowMs) / 1000)
          : 0,
      rateRemaining: rateInfo.remaining,
    };
  }

  if (upstreamCooldownUntilMs > nowMs) {
    const cooldownSec = Math.max(1, Math.ceil((upstreamCooldownUntilMs - nowMs) / 1000));
    return {
      ok: false,
      statusCode: 429,
      code: 'QUOTA_COOLDOWN',
      cooldownSec,
      message: `AI Advisor is cooling down for ${cooldownSec}s to protect API quota. Try again shortly.`,
    };
  }

  const rateCheck = checkAdminAiRateLimit(adminKey, nowMs);
  if (!rateCheck.allowed) {
    return {
      ok: false,
      statusCode: 429,
      code: 'RATE_LIMITED',
      cooldownSec: rateCheck.retryAfterSec,
      message: `Rate limit reached (10 live AI queries/min). Wait ${rateCheck.retryAfterSec}s or reuse an existing cached insight.`,
    };
  }

  const apiKey = String(
    apiKeyOverride !== undefined ? apiKeyOverride : process.env.GEMINI_API_KEY || ''
  ).trim();
  if (!apiKey) {
    return {
      ok: false,
      statusCode: 503,
      code: 'AI_NOT_CONFIGURED',
      message:
        'GEMINI_API_KEY is not configured on the server. Add it in Hosting Settings > Secrets to enable AI Advisor.',
    };
  }

  const historyBlock =
    boundedHistory.length > 0
      ? `\nRecent conversation context:\n${boundedHistory
          .map((t) => `${t.role === 'assistant' ? 'Advisor' : 'Owner'}: ${t.text}`)
          .join('\n')}`
      : '';

  const userPrompt = [
    `Sanitized Analytics Snapshot (hash: ${snapshotHash}):`,
    JSON.stringify(sanitized),
    historyBlock,
    `\nOwner Request: ${cleanQuestion}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const ai = clientFactory(apiKey);
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    const answer = String(response?.text || '').trim();
    if (!answer) {
      return {
        ok: false,
        statusCode: 502,
        code: 'EMPTY_AI_RESPONSE',
        message: 'Gemini returned an empty response. Please try asking again.',
      };
    }

    const rateRemaining = recordAdminAiCall(adminKey, nowMs);
    AI_RESPONSE_CACHE.set(cacheDigest, {
      answer,
      createdAtMs: nowMs,
    });

    return {
      ok: true,
      statusCode: 200,
      answer,
      cached: false,
      snapshotHash,
      cooldownSec: 0,
      rateRemaining,
    };
  } catch (err) {
    const rawMsg = String(err?.message || err || '');
    const status = Number(err?.status || err?.code || 0);

    if (
      status === 429 ||
      rawMsg.includes('429') ||
      rawMsg.includes('RESOURCE_EXHAUSTED') ||
      rawMsg.toLowerCase().includes('quota')
    ) {
      upstreamCooldownUntilMs = nowMs + COOLDOWN_AFTER_429_MS;
      return {
        ok: false,
        statusCode: 429,
        code: 'RESOURCE_EXHAUSTED',
        cooldownSec: Math.ceil(COOLDOWN_AFTER_429_MS / 1000),
        message:
          'Gemini API rate or quota limit reached. Automatic 45s cooldown activated to preserve quota.',
      };
    }

    if (
      status === 400 ||
      status === 403 ||
      rawMsg.includes('API_KEY_INVALID') ||
      rawMsg.includes('PERMISSION_DENIED')
    ) {
      return {
        ok: false,
        statusCode: status === 400 ? 400 : 403,
        code: 'API_KEY_REJECTED',
        message:
          'Server Gemini API key was rejected or lacks permission. Verify GEMINI_API_KEY in Settings > Secrets.',
      };
    }

    return {
      ok: false,
      statusCode: 502,
      code: 'AI_UPSTREAM_ERROR',
      message: 'Could not reach Gemini AI right now. Please try again in a moment.',
    };
  }
}
