import crypto from 'node:crypto';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const DEFAULT_GEMINI_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-4-hydrogen',
  'gemini-2.5-flash',
];
const PROHIBITED_DEPRECATED_MODELS = new Set([
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
  'gemini-2.0-flash',
  'gemini-2.0-pro',
  'gemini-2.0-flash-thinking',
]);
const ATTEMPT_TIMEOUT_MS = 12 * 1000;
const LIST_MODELS_TIMEOUT_MS = 4000;
const TOTAL_REQUEST_BUDGET_MS = 22 * 1000;
const RETRY_503_BACKOFF_MS = 650;
const MODEL_CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 80;
const RATE_WINDOW_MS = 60 * 1000;
const MAX_LIVE_CALLS_PER_WINDOW = 6;
const HOURLY_RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_LIVE_CALLS_PER_HOUR = 30;
const MIN_GAP_BETWEEN_LIVE_CALLS_MS = 2500;
const COOLDOWN_AFTER_429_MS = 60 * 1000;

const UNAVAILABLE_MODEL_CACHE = new Map();
let discoveredModelsCache = { models: [], expiresAtMs: 0 };
let lastWorkingModelState = { model: '', expiresAtMs: 0 };

function normalizeModelId(rawName) {
  return String(rawName || '')
    .trim()
    .replace(/^models\//i, '');
}

function isModelMarkedUnavailable(model, nowMs) {
  const expiresAt = UNAVAILABLE_MODEL_CACHE.get(model);
  if (!expiresAt) return false;
  if (nowMs >= expiresAt) {
    UNAVAILABLE_MODEL_CACHE.delete(model);
    return false;
  }
  return true;
}

function markModelUnavailable(model, nowMs) {
  if (!model) return;
  UNAVAILABLE_MODEL_CACHE.set(model, nowMs + MODEL_CACHE_TTL_MS);
  if (lastWorkingModelState.model === model) {
    lastWorkingModelState = { model: '', expiresAtMs: 0 };
  }
}

function recordWorkingModel(model, nowMs) {
  if (!model) return;
  UNAVAILABLE_MODEL_CACHE.delete(model);
  lastWorkingModelState = { model, expiresAtMs: nowMs + MODEL_CACHE_TTL_MS };
}

function getGeminiModelCandidates(nowMs = Date.now()) {
  const envModel = normalizeModelId(process.env.GEMINI_MODEL || '');
  const stickyModel =
    lastWorkingModelState.model && nowMs < lastWorkingModelState.expiresAtMs
      ? lastWorkingModelState.model
      : '';
  const discovered =
    nowMs < discoveredModelsCache.expiresAtMs ? discoveredModelsCache.models : [];

  const raw = [envModel, stickyModel, ...DEFAULT_GEMINI_MODELS, ...discovered];
  const seen = new Set();
  const candidates = [];
  for (const item of raw) {
    const trimmed = normalizeModelId(item);
    if (!trimmed || seen.has(trimmed)) continue;
    if (PROHIBITED_DEPRECATED_MODELS.has(trimmed.toLowerCase()) && trimmed !== envModel) {
      continue;
    }
    if (isModelMarkedUnavailable(trimmed, nowMs)) continue;
    seen.add(trimmed);
    candidates.push(trimmed);
  }

  // Always keep at least one fallback if every model aged into the unavailable cache
  if (candidates.length === 0) {
    for (const item of [envModel, ...DEFAULT_GEMINI_MODELS]) {
      const trimmed = normalizeModelId(item);
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        candidates.push(trimmed);
      }
    }
  }
  return candidates;
}

/**
 * Builds model-safe generateContent config:
 * - Never passes deprecated sampling params (temperature, topP, topK, candidateCount).
 * - Never sets tiny maxOutputTokens that can starve thinking tokens and yield empty text.
 * - Applies thinkingLevel for Gemini 4 / Gemini 3 models, and thinkingBudget: 0 for Gemini 2.5.
 */
export function buildGeminiRequestConfig(model, systemInstruction) {
  const id = normalizeModelId(model).toLowerCase();
  const base = systemInstruction ? { systemInstruction } : {};

  if (id.startsWith('gemini-4')) {
    return {
      ...base,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    };
  }
  if (id.startsWith('gemini-3.1-flash-lite')) {
    return {
      ...base,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
    };
  }
  if (id.startsWith('gemini-3') && id.includes('flash')) {
    return {
      ...base,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    };
  }
  if (id.startsWith('gemini-2.5')) {
    return {
      ...base,
      thinkingConfig: { thinkingBudget: 0 },
    };
  }
  return base;
}

/**
 * Filters and ranks live models returned by Google AI Studio `models.list()`
 * so external keys with different preview/stable aliases self-heal automatically.
 */
export function selectDiscoveredFlashModels(rawModels) {
  if (!Array.isArray(rawModels)) return [];
  const excludedSubstrings = [
    'embedding',
    'imagen',
    'veo',
    'lyria',
    'tts',
    'transcribe',
    'translate',
    'live',
    'audio',
    'image',
    'vision',
    'robotics',
    'computer-use',
    'deep-research',
    'aqa',
    'bisheng',
    'omni',
    'genie',
    'decision',
    'exp-image',
    'learnlm',
  ];

  const scored = [];
  const seen = new Set();
  for (const entry of rawModels) {
    const id = normalizeModelId(typeof entry === 'string' ? entry : entry?.name);
    if (!id || seen.has(id)) continue;
    const lower = id.toLowerCase();

    if (!lower.startsWith('gemini-')) continue;
    if (
      PROHIBITED_DEPRECATED_MODELS.has(lower) ||
      lower.startsWith('gemini-1.') ||
      lower.startsWith('gemini-2.0')
    ) {
      continue;
    }
    if (excludedSubstrings.some((bad) => lower.includes(bad))) continue;

    if (entry && typeof entry === 'object') {
      const actions = entry.supportedActions || entry.supportedGenerationMethods;
      if (
        Array.isArray(actions) &&
        actions.length > 0 &&
        !actions.some((a) => String(a).toLowerCase() === 'generatecontent')
      ) {
        continue;
      }
    }

    let score = 50;
    if (lower === 'gemini-4-hydrogen') score = 100;
    else if (lower === 'gemini-3.1-flash-lite') score = 95;
    else if (lower.startsWith('gemini-3.1-flash-lite')) score = 92;
    else if (lower.startsWith('gemini-3') && lower.includes('flash')) score = 90;
    else if (lower === 'gemini-2.5-flash') score = 85;
    else if (lower.startsWith('gemini-2.5-flash-lite')) score = 80;
    else if (lower.startsWith('gemini-2.5-flash')) score = 78;
    else if (lower.includes('flash')) score = 70;
    else if (lower.includes('lite')) score = 65;
    else if (lower.includes('pro')) score = 30;

    seen.add(id);
    scored.push({ id, score });
  }

  return scored.sort((a, b) => b.score - a.score).map((item) => item.id);
}

function extractErrorStatus(err) {
  const candidates = [err?.status, err?.statusCode, err?.code, err?.error?.code];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n >= 100 && n < 600) return n;
  }
  const msg = String(err?.message || err || '');
  const match = msg.match(/\b(400|401|403|404|429|500|502|503|504)\b/);
  return match ? Number(match[1]) : 0;
}

function isNotFoundModelError(rawMsg, status) {
  const lower = rawMsg.toLowerCase();
  return (
    status === 404 ||
    rawMsg.includes('NOT_FOUND') ||
    lower.includes('not found') ||
    lower.includes('unsupported model') ||
    lower.includes('is not supported for generatecontent')
  );
}

function isServiceUnavailableError(rawMsg, status) {
  const lower = rawMsg.toLowerCase();
  return (
    status === 503 ||
    rawMsg.includes('UNAVAILABLE') ||
    lower.includes('unavailable') ||
    lower.includes('overloaded') ||
    lower.includes('high demand')
  );
}

function isUnsupportedConfigError(rawMsg, status) {
  if (status !== 400) return false;
  const lower = rawMsg.toLowerCase();
  return (
    lower.includes('thinking') ||
    lower.includes('temperature') ||
    lower.includes('unknown name') ||
    lower.includes('invalid argument')
  );
}

/**
 * Official @google/genai server-side client wrapper:
 * - Sends required `User-Agent: aistudio-build` header in httpOptions.
 * - Applies model-safe config (no deprecated sampling params or starved maxOutputTokens).
 * - Retries once with bare `{ systemInstruction }` if a specific model rejects thinkingConfig.
 * - Exposes `models.list()` for dynamic self-healing model discovery if static models 404.
 */
function createSdkGeminiClient(apiKey) {
  const sdk = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  return {
    models: {
      async generateContent({ model, contents, config }) {
        const systemInstruction = config?.systemInstruction;
        const safeConfig = buildGeminiRequestConfig(model, systemInstruction);
        try {
          const response = await sdk.models.generateContent({
            model,
            contents,
            config: safeConfig,
          });
          return { text: String(response?.text || '').trim() };
        } catch (err) {
          const rawMsg = String(err?.message || err || '');
          const status = extractErrorStatus(err);
          if (safeConfig.thinkingConfig && isUnsupportedConfigError(rawMsg, status)) {
            const fallbackResponse = await sdk.models.generateContent({
              model,
              contents,
              config: systemInstruction ? { systemInstruction } : undefined,
            });
            return { text: String(fallbackResponse?.text || '').trim() };
          }
          throw err;
        }
      },
      async list() {
        const pager = await sdk.models.list({ config: { pageSize: 100 } });
        const items = [];
        for await (const m of pager) {
          items.push(m);
          if (items.length >= 100) break;
        }
        return items;
      },
    },
  };
}

async function discoverAvailableGeminiModels(ai, nowMs, timeoutMs) {
  if (nowMs < discoveredModelsCache.expiresAtMs && discoveredModelsCache.models.length > 0) {
    return discoveredModelsCache.models;
  }
  if (!ai?.models || typeof ai.models.list !== 'function') {
    return [];
  }
  let timer = null;
  try {
    const listPromise = Promise.resolve().then(() => ai.models.list());
    listPromise.catch(() => {});
    const rawResult = await Promise.race([
      listPromise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('MODEL_LIST_TIMEOUT')), timeoutMs);
      }),
    ]);

    let rawList = [];
    if (Array.isArray(rawResult)) {
      rawList = rawResult;
    } else if (rawResult && typeof rawResult[Symbol.asyncIterator] === 'function') {
      for await (const m of rawResult) {
        rawList.push(m);
        if (rawList.length >= 100) break;
      }
    } else if (Array.isArray(rawResult?.models)) {
      rawList = rawResult.models;
    }

    const selected = selectDiscoveredFlashModels(rawList);
    if (selected.length > 0) {
      discoveredModelsCache = {
        models: selected,
        expiresAtMs: nowMs + MODEL_CACHE_TTL_MS,
      };
    }
    return selected;
  } catch {
    return [];
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function generateWithTimeout(ai, { model, contents, systemInstruction, timeoutMs }) {
  let timer = null;
  let settled = false;
  try {
    const callPromise = Promise.resolve().then(() =>
      ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
        },
      })
    );
    // Prevent unhandled rejection if timeout wins the race
    callPromise.catch(() => {});

    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        if (!settled) {
          const timeoutErr = new Error(`Gemini request timed out after ${timeoutMs}ms`);
          timeoutErr.code = 'AI_TIMEOUT';
          reject(timeoutErr);
        }
      }, timeoutMs);
    });

    const result = await Promise.race([callPromise, timeoutPromise]);
    settled = true;
    return result;
  } finally {
    settled = true;
    if (timer) clearTimeout(timer);
  }
}

const AI_RESPONSE_CACHE = new Map();
const ADMIN_RATE_TRACKER = new Map();
const ADMIN_HOURLY_TRACKER = new Map();
const IN_FLIGHT_REQUESTS = new Map();
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
        INTL: { singleUsd: 1.99, pass7dUsd: 3.99, pass30dUsd: 6.99 },
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
  return createSdkGeminiClient(apiKey);
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
  const existingMin = ADMIN_RATE_TRACKER.get(bucketKey) || [];
  const activeMin = existingMin.filter((ts) => nowMs - ts < RATE_WINDOW_MS);

  const existingHour = ADMIN_HOURLY_TRACKER.get(bucketKey) || [];
  const activeHour = existingHour.filter((ts) => nowMs - ts < HOURLY_RATE_WINDOW_MS);

  // Short burst guard (prevents rapid double-click / automated spam loops)
  if (activeMin.length > 0) {
    const latest = activeMin[activeMin.length - 1];
    const gapMs = nowMs - latest;
    if (gapMs >= 0 && gapMs < MIN_GAP_BETWEEN_LIVE_CALLS_MS) {
      return {
        allowed: false,
        remaining: Math.max(0, MAX_LIVE_CALLS_PER_WINDOW - activeMin.length),
        retryAfterSec: Math.max(1, Math.ceil((MIN_GAP_BETWEEN_LIVE_CALLS_MS - gapMs) / 1000)),
        reason: 'BURST_COOLDOWN',
      };
    }
  }

  if (activeMin.length >= MAX_LIVE_CALLS_PER_WINDOW) {
    const oldest = activeMin[0];
    const retryAfterSec = Math.max(1, Math.ceil((RATE_WINDOW_MS - (nowMs - oldest)) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec, reason: 'MINUTE_LIMIT' };
  }

  if (activeHour.length >= MAX_LIVE_CALLS_PER_HOUR) {
    const oldestHour = activeHour[0];
    const retryAfterSec = Math.max(
      1,
      Math.ceil((HOURLY_RATE_WINDOW_MS - (nowMs - oldestHour)) / 1000)
    );
    return { allowed: false, remaining: 0, retryAfterSec, reason: 'HOURLY_LIMIT' };
  }

  return {
    allowed: true,
    remaining: Math.max(0, MAX_LIVE_CALLS_PER_WINDOW - activeMin.length),
    retryAfterSec: 0,
    reason: null,
  };
}

function recordAdminAiCall(adminKey, nowMs) {
  const bucketKey = String(adminKey || 'owner_default').slice(0, 64);
  const existingMin = ADMIN_RATE_TRACKER.get(bucketKey) || [];
  const activeMin = existingMin.filter((ts) => nowMs - ts < RATE_WINDOW_MS);
  activeMin.push(nowMs);
  ADMIN_RATE_TRACKER.set(bucketKey, activeMin);

  const existingHour = ADMIN_HOURLY_TRACKER.get(bucketKey) || [];
  const activeHour = existingHour.filter((ts) => nowMs - ts < HOURLY_RATE_WINDOW_MS);
  activeHour.push(nowMs);
  ADMIN_HOURLY_TRACKER.set(bucketKey, activeHour);

  return Math.max(0, MAX_LIVE_CALLS_PER_WINDOW - activeMin.length);
}

export function resetOwnerAiStateForTests() {
  AI_RESPONSE_CACHE.clear();
  ADMIN_RATE_TRACKER.clear();
  ADMIN_HOURLY_TRACKER.clear();
  IN_FLIGHT_REQUESTS.clear();
  UNAVAILABLE_MODEL_CACHE.clear();
  discoveredModelsCache = { models: [], expiresAtMs: 0 };
  lastWorkingModelState = { model: '', expiresAtMs: 0 };
  upstreamCooldownUntilMs = 0;
}

const SYSTEM_INSTRUCTION = [
  'You are the private business and revenue analyst for "Send A Bouquet", a custom digital floral gifting studio.',
  'Audience: the studio owner and prospective business buyers evaluating traction, unit economics, and monetization upside.',
  'Strict Data Rules:',
  '- Ground every claim strictly in the provided sanitized JSON metrics snapshot.',
  '- Never fabricate numbers or claim revenue that is zero. If live counters are low or zero, state that clearly and walk through realistic sensitivity math using the live PH (₱49 / ₱99 / ₱199) and INTL ($1.99 / $3.99 / $6.99) catalog prices.',
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
    const limitMessage =
      rateCheck.reason === 'BURST_COOLDOWN'
        ? `Please wait ${rateCheck.retryAfterSec}s before sending another question.`
        : rateCheck.reason === 'HOURLY_LIMIT'
        ? `Hourly AI limit reached (${MAX_LIVE_CALLS_PER_HOUR}/hr) to protect quota. Try again later or reuse cached insights.`
        : `Rate limit reached (${MAX_LIVE_CALLS_PER_WINDOW} live queries/min). Wait ${rateCheck.retryAfterSec}s or reuse a cached insight.`;
    return {
      ok: false,
      statusCode: 429,
      code: 'RATE_LIMITED',
      cooldownSec: rateCheck.retryAfterSec,
      message: limitMessage,
    };
  }

  // Deduplicate concurrent identical requests so rapid double-taps never fire 2 upstream Gemini calls
  if (IN_FLIGHT_REQUESTS.has(cacheDigest)) {
    return IN_FLIGHT_REQUESTS.get(cacheDigest);
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

  const executeLiveCall = async () => {
    const startedAtMs = Date.now();
    const getRemainingBudgetMs = () =>
      Math.max(0, TOTAL_REQUEST_BUDGET_MS - (Date.now() - startedAtMs));

    try {
      const ai = clientFactory(apiKey);
      const modelCandidates = getGeminiModelCandidates(nowMs);
      let response = null;
      let succeededModel = '';
      let lastErr = null;
      let last503Err = null;
      let overloadedModel = '';
      let sawNotFound = false;
      const triedModels = new Set();

      const attemptModel = async (model) => {
        const remaining = getRemainingBudgetMs();
        if (remaining < 1500) {
          const budgetErr = new Error('Gemini request exceeded total time budget');
          budgetErr.code = 'AI_TIMEOUT';
          throw budgetErr;
        }
        const timeoutMs = Math.min(ATTEMPT_TIMEOUT_MS, remaining);
        const res = await generateWithTimeout(ai, {
          model,
          contents: userPrompt,
          systemInstruction: SYSTEM_INSTRUCTION,
          timeoutMs,
        });
        const text = String(res?.text || '').trim();
        if (!text) {
          const emptyErr = new Error('Gemini returned an empty response');
          emptyErr.code = 'EMPTY_AI_RESPONSE';
          throw emptyErr;
        }
        return { text };
      };

      const runCandidateQueue = async (queue) => {
        for (const model of queue) {
          if (!model || triedModels.has(model)) continue;
          triedModels.add(model);
          try {
            response = await attemptModel(model);
            succeededModel = model;
            lastErr = null;
            return true;
          } catch (err) {
            lastErr = err;
            const rawMsg = String(err?.message || err || '');
            const status = extractErrorStatus(err);

            if (isNotFoundModelError(rawMsg, status)) {
              sawNotFound = true;
              markModelUnavailable(model, nowMs);
              continue;
            }
            if (isServiceUnavailableError(rawMsg, status)) {
              last503Err = err;
              if (!overloadedModel) overloadedModel = model;
              continue;
            }
            if (err?.code === 'AI_TIMEOUT' && getRemainingBudgetMs() >= 5500) {
              continue;
            }
            // Non-retryable error (429 quota, 401/403 key error, 400 bad request)
            return false;
          }
        }
        return false;
      };

      let succeeded = await runCandidateQueue(modelCandidates);

      // Self-heal when static model aliases 404 on an external Google AI Studio API key:
      // query live models.list() once (cached 30m) and try top compatible Flash/Lite models.
      if (!succeeded && sawNotFound && getRemainingBudgetMs() >= 4500) {
        const discovered = await discoverAvailableGeminiModels(
          ai,
          nowMs,
          Math.min(LIST_MODELS_TIMEOUT_MS, Math.max(1500, getRemainingBudgetMs() - 2500))
        );
        const freshCandidates = discovered
          .filter((m) => !triedModels.has(m) && !isModelMarkedUnavailable(m, nowMs))
          .slice(0, 2);
        if (freshCandidates.length > 0) {
          succeeded = await runCandidateQueue(freshCandidates);
        }
      }

      // Single short backoff retry if a real model was temporarily overloaded (503)
      if (!succeeded && overloadedModel && getRemainingBudgetMs() >= 4000) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_503_BACKOFF_MS));
        try {
          response = await attemptModel(overloadedModel);
          succeededModel = overloadedModel;
          lastErr = null;
          succeeded = true;
        } catch (retryErr) {
          lastErr = retryErr;
          const retryMsg = String(retryErr?.message || retryErr || '');
          const retryStatus = extractErrorStatus(retryErr);
          if (isServiceUnavailableError(retryMsg, retryStatus)) {
            last503Err = retryErr;
          }
        }
      }

      if (!succeeded) {
        // Preserve 503 ServiceUnavailable if a valid model existed but was busy (never mask with a later 404)
        const finalErr =
          last503Err && isNotFoundModelError(String(lastErr?.message || ''), extractErrorStatus(lastErr))
            ? last503Err
            : lastErr || last503Err || new Error('Gemini request failed');
        throw finalErr;
      }

      const answer = String(response?.text || '').trim();
      if (!answer) {
        return {
          ok: false,
          statusCode: 502,
          code: 'EMPTY_AI_RESPONSE',
          message: 'Gemini returned an empty response. Please try asking again.',
        };
      }

      if (succeededModel) {
        recordWorkingModel(succeededModel, nowMs);
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
        modelUsed: succeededModel || undefined,
        snapshotHash,
        cooldownSec: 0,
        rateRemaining,
      };
    } catch (err) {
      const rawMsg = String(err?.message || err || '');
      const status = extractErrorStatus(err);

      if (err?.code === 'EMPTY_AI_RESPONSE') {
        return {
          ok: false,
          statusCode: 502,
          code: 'EMPTY_AI_RESPONSE',
          message: 'Gemini returned an empty response. Please try asking again.',
        };
      }

      if (err?.code === 'AI_TIMEOUT') {
        return {
          ok: false,
          statusCode: 504,
          code: 'AI_TIMEOUT',
          message: 'Gemini took too long to respond. Please try again in a moment.',
        };
      }

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
            'Gemini API rate or quota limit reached. Automatic 60s cooldown activated to preserve quota.',
        };
      }

      const lowerMsg = rawMsg.toLowerCase();
      if (
        status === 401 ||
        status === 403 ||
        rawMsg.includes('API_KEY_INVALID') ||
        rawMsg.includes('PERMISSION_DENIED') ||
        lowerMsg.includes('api key not valid') ||
        lowerMsg.includes('api key expired') ||
        lowerMsg.includes('invalid api key')
      ) {
        return {
          ok: false,
          statusCode: status === 400 ? 400 : 403,
          code: 'API_KEY_REJECTED',
          message:
            'Server Gemini API key was rejected or lacks permission. Verify GEMINI_API_KEY in Settings > Secrets or Vercel Environment Variables.',
        };
      }

      if (status === 400) {
        const safeDetail = stripSensitivePatterns(rawMsg)
          .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_KEY]')
          .replace(/\s+/g, ' ')
          .slice(0, 140);
        return {
          ok: false,
          statusCode: 400,
          code: 'AI_BAD_REQUEST',
          message: safeDetail
            ? `Gemini rejected the request (HTTP 400): ${safeDetail}`
            : 'Gemini rejected the request (HTTP 400). Please try again.',
        };
      }

      if (isServiceUnavailableError(rawMsg, status)) {
        return {
          ok: false,
          statusCode: 503,
          code: 'AI_OVERLOADED',
          message: 'Gemini is temporarily busy (503). Please try again in a few seconds.',
        };
      }

      if (isNotFoundModelError(rawMsg, status)) {
        return {
          ok: false,
          statusCode: 502,
          code: 'AI_MODEL_UNAVAILABLE',
          message:
            'No active Gemini text model matched your API key (HTTP 404). Remove any outdated GEMINI_MODEL override or verify your Google AI Studio key access.',
        };
      }

      return {
        ok: false,
        statusCode: 502,
        code: 'AI_UPSTREAM_ERROR',
        message: `Could not reach Gemini AI right now${status ? ` (HTTP ${status})` : ''}. Please try again in a moment.`,
      };
    }
  };

  const livePromise = executeLiveCall();
  IN_FLIGHT_REQUESTS.set(cacheDigest, livePromise);
  try {
    return await livePromise;
  } finally {
    if (IN_FLIGHT_REQUESTS.get(cacheDigest) === livePromise) {
      IN_FLIGHT_REQUESTS.delete(cacheDigest);
    }
  }
}
