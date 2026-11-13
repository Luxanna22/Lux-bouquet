import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { BouquetSnapshot, SavedVaultBouquet } from '../types/bouquet';
import {
  stripInlineAudioFromCompactPayload,
  stripInlinePhotosFromCompactPayload
} from './shareAndExport';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: boolean | string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface SharedBouquetRecord {
  code: string;
  payload: string;
  voiceAudioDataUrl?: string;
  voiceStyle?: string;
  voiceTitle?: string;
  voiceDurationSec?: number;
  openCount?: number;
  voicePlayCount?: number;
  reaction?: string;
  recipientReply?: string;
  repliedAt?: string;
  isPremium?: boolean;
  retentionDays?: number;
  createdAt: string;
}

export interface StudioGlobalStats {
  bouquetsCreated: number;
  voiceNotesRecorded: number;
  bouquetsOpened: number;
  reactionsSent: number;
  updatedAt: string;
}

const DEFAULT_STUDIO_STATS: StudioGlobalStats = {
  bouquetsCreated: 1284,
  voiceNotesRecorded: 742,
  bouquetsOpened: 3910,
  reactionsSent: 964,
  updatedAt: new Date().toISOString()
};

const CODE_REGEX = /^[a-zA-Z0-9_\-]{7,24}$/;

function sanitizeRecordForFirestore(existing: Partial<SharedBouquetRecord> | null, patch: Partial<SharedBouquetRecord>, code: string): SharedBouquetRecord {
  const record: SharedBouquetRecord = {
    code,
    payload: (patch.payload ?? existing?.payload ?? '').slice(0, 900000),
    createdAt:
      existing && typeof existing.createdAt === 'string' && existing.createdAt.length >= 10
        ? existing.createdAt
        : patch.createdAt || new Date().toISOString()
  };

  const audio = patch.voiceAudioDataUrl ?? existing?.voiceAudioDataUrl;
  if (audio && typeof audio === 'string' && audio.length <= 900000) {
    record.voiceAudioDataUrl = audio;
  }

  const style = patch.voiceStyle ?? existing?.voiceStyle;
  if (style && typeof style === 'string') {
    record.voiceStyle = style.slice(0, 32);
  }

  const title = patch.voiceTitle ?? existing?.voiceTitle;
  if (title !== undefined && typeof title === 'string') {
    record.voiceTitle = title.slice(0, 64);
  }

  const dur = patch.voiceDurationSec ?? existing?.voiceDurationSec;
  if (typeof dur === 'number' && Number.isFinite(dur)) {
    record.voiceDurationSec = Math.max(0, Math.min(600, Math.round(dur)));
  }

  const opens = patch.openCount ?? existing?.openCount;
  if (typeof opens === 'number' && Number.isFinite(opens)) {
    record.openCount = Math.max(0, Math.min(1000000, Math.round(opens)));
  }

  const plays = patch.voicePlayCount ?? existing?.voicePlayCount;
  if (typeof plays === 'number' && Number.isFinite(plays)) {
    record.voicePlayCount = Math.max(0, Math.min(1000000, Math.round(plays)));
  }

  const reaction = patch.reaction ?? existing?.reaction;
  if (reaction && typeof reaction === 'string') {
    record.reaction = reaction.slice(0, 32);
  }

  const reply = patch.recipientReply ?? existing?.recipientReply;
  if (reply !== undefined && typeof reply === 'string') {
    record.recipientReply = reply.slice(0, 240);
  }

  const repliedAt = patch.repliedAt ?? existing?.repliedAt;
  if (repliedAt && typeof repliedAt === 'string') {
    record.repliedAt = repliedAt.slice(0, 64);
  }

  const isPremium = patch.isPremium ?? existing?.isPremium;
  if (typeof isPremium === 'boolean') {
    record.isPremium = isPremium;
  }

  const retentionDays = patch.retentionDays ?? existing?.retentionDays;
  if (typeof retentionDays === 'number' && Number.isFinite(retentionDays)) {
    record.retentionDays = Math.max(1, Math.min(36500, Math.round(retentionDays)));
  }

  return record;
}

export async function saveSharedBouquetToFirestore(
  code: string,
  payload: string,
  snapshot?: BouquetSnapshot,
  retentionMeta?: { isPremium?: boolean; retentionDays?: number }
): Promise<boolean> {
  if (!code || !CODE_REGEX.test(code)) return false;
  if (!payload || payload.length < 3) return false;

  const voice = snapshot?.voice;
  const cleanPayload = voice?.audioDataUrl
    ? stripInlineAudioFromCompactPayload(payload)
    : payload;
  if (cleanPayload.length > 900000) return false;

  const docPath = `shared_bouquets/${code}`;
  const docRef = doc(db, 'shared_bouquets', code);

  try {
    const existingSnap = await getDoc(docRef);
    const existingData = existingSnap.exists()
      ? (existingSnap.data() as Partial<SharedBouquetRecord>)
      : null;

    const record = sanitizeRecordForFirestore(
      existingData,
      {
        payload: cleanPayload,
        voiceAudioDataUrl: voice?.audioDataUrl || undefined,
        voiceStyle: voice?.style,
        voiceTitle: voice?.title,
        voiceDurationSec: voice?.durationSec,
        openCount: existingData?.openCount ?? 0,
        voicePlayCount: existingData?.voicePlayCount ?? 0,
        isPremium: retentionMeta?.isPremium ?? existingData?.isPremium,
        retentionDays: retentionMeta?.retentionDays ?? existingData?.retentionDays,
      },
      code
    );

    await setDoc(docRef, record);
    if (!existingSnap.exists()) {
      incrementStudioGlobalStat('bouquetsCreated', Boolean(voice?.audioDataUrl)).catch(() => {});
    }
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
    console.warn('Could not save shared bouquet to Firestore:', error);
    return false;
  }
}

export async function fetchSharedBouquetFromFirestore(
  code: string
): Promise<SharedBouquetRecord | null> {
  if (!code || !CODE_REGEX.test(code)) return null;
  const docPath = `shared_bouquets/${code}`;
  try {
    const snap = await getDoc(doc(db, 'shared_bouquets', code));
    if (!snap.exists()) return null;
    const data = snap.data() as SharedBouquetRecord;
    if (!data || typeof data.payload !== 'string') return null;
    return data;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.GET, docPath);
    }
    console.warn('Could not fetch shared bouquet from Firestore:', error);
    return null;
  }
}

export async function incrementSharedBouquetOpenCount(code: string): Promise<number | null> {
  if (!code || !CODE_REGEX.test(code)) return null;
  const docRef = doc(db, 'shared_bouquets', code);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const existing = snap.data() as SharedBouquetRecord;
    const nextCount = (existing.openCount || 0) + 1;
    const updated = sanitizeRecordForFirestore(existing, { openCount: nextCount }, code);
    await setDoc(docRef, updated);
    incrementStudioGlobalStat('bouquetsOpened').catch(() => {});
    return nextCount;
  } catch {
    return null;
  }
}

export async function incrementSharedBouquetVoicePlayCount(code: string): Promise<number | null> {
  if (!code || !CODE_REGEX.test(code)) return null;
  const docRef = doc(db, 'shared_bouquets', code);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const existing = snap.data() as SharedBouquetRecord;
    const nextCount = (existing.voicePlayCount || 0) + 1;
    const updated = sanitizeRecordForFirestore(existing, { voicePlayCount: nextCount }, code);
    await setDoc(docRef, updated);
    return nextCount;
  } catch {
    return null;
  }
}

export async function submitSharedBouquetReaction(
  code: string,
  reaction: string,
  recipientReply?: string
): Promise<boolean> {
  if (!code || !CODE_REGEX.test(code)) return false;
  const docRef = doc(db, 'shared_bouquets', code);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return false;
    const existing = snap.data() as SharedBouquetRecord;
    const isFirstReaction = !existing.reaction && !existing.recipientReply;
    const updated = sanitizeRecordForFirestore(
      existing,
      {
        reaction: reaction.slice(0, 32),
        recipientReply: recipientReply !== undefined ? recipientReply.trim().slice(0, 240) : existing.recipientReply,
        repliedAt: new Date().toISOString()
      },
      code
    );
    await setDoc(docRef, updated);
    if (isFirstReaction) {
      incrementStudioGlobalStat('reactionsSent').catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}

export async function fetchStudioGlobalStats(): Promise<StudioGlobalStats> {
  try {
    const docRef = doc(db, 'studio_stats', 'global');
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, DEFAULT_STUDIO_STATS).catch(() => {});
      return DEFAULT_STUDIO_STATS;
    }
    const data = snap.data() as Partial<StudioGlobalStats>;
    return {
      bouquetsCreated: typeof data.bouquetsCreated === 'number' ? data.bouquetsCreated : DEFAULT_STUDIO_STATS.bouquetsCreated,
      voiceNotesRecorded: typeof data.voiceNotesRecorded === 'number' ? data.voiceNotesRecorded : DEFAULT_STUDIO_STATS.voiceNotesRecorded,
      bouquetsOpened: typeof data.bouquetsOpened === 'number' ? data.bouquetsOpened : DEFAULT_STUDIO_STATS.bouquetsOpened,
      reactionsSent: typeof data.reactionsSent === 'number' ? data.reactionsSent : DEFAULT_STUDIO_STATS.reactionsSent,
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : DEFAULT_STUDIO_STATS.updatedAt
    };
  } catch {
    return DEFAULT_STUDIO_STATS;
  }
}

export async function incrementStudioGlobalStat(
  field: 'bouquetsCreated' | 'voiceNotesRecorded' | 'bouquetsOpened' | 'reactionsSent',
  alsoIncrementVoice = false
): Promise<void> {
  try {
    const docRef = doc(db, 'studio_stats', 'global');
    const current = await fetchStudioGlobalStats();
    const next: StudioGlobalStats = {
      ...current,
      [field]: (current[field] || 0) + 1,
      voiceNotesRecorded: alsoIncrementVoice
        ? (current.voiceNotesRecorded || 0) + 1
        : current.voiceNotesRecorded,
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, next);
  } catch {
    // Ignore background stats increment errors
  }
}

const VAULT_STORAGE_KEY = 'flowers_for_you_local_vault_v1';
let inMemoryVaultCache: SavedVaultBouquet[] | null = null;

function stripInlineAudioFromPayload(payload?: string): string | undefined {
  if (!payload) return payload;
  const idx = payload.indexOf('&a=');
  const base = idx >= 0 ? payload.slice(0, idx) : payload;
  return stripInlineAudioFromCompactPayload(base);
}

const DEFAULT_NAMES = new Set([
  '',
  'my dearest',
  'yours always',
  'someone special',
  'yours',
  'secret admirer',
]);

function deduplicateVaultList(list: SavedVaultBouquet[]): SavedVaultBouquet[] {
  const seenCodes = new Set<string>();
  const result: SavedVaultBouquet[] = [];

  // Sort newest first so updated/re-shared creations always take precedence over older drafts
  const sorted = [...list].sort((a, b) => {
    const tA = Date.parse(a?.createdAt || '') || 0;
    const tB = Date.parse(b?.createdAt || '') || 0;
    return tB - tA;
  });

  for (const item of sorted) {
    if (!item || typeof item.code !== 'string') continue;
    if (seenCodes.has(item.code)) continue;

    const itemTime = Date.parse(item.createdAt || '') || 0;
    const itemToNorm = (item.to || item.recipientName || '').trim().toLowerCase();
    const itemFromNorm = (item.from || item.senderName || '').trim().toLowerCase();
    const hasCustomNames = !DEFAULT_NAMES.has(itemToNorm) || !DEFAULT_NAMES.has(itemFromNorm);

    // Only collapse an older draft if a newer shared creation exists for the exact same custom (to, from) within 60 mins
    const isSupersededDraft =
      hasCustomNames &&
      Boolean(item.isDraft) &&
      result.some((existing) => {
        if (existing.isDraft) return false;
        const existingTime = Date.parse(existing.createdAt || '') || 0;
        const withinWindow = Math.abs(existingTime - itemTime) < 60 * 60 * 1000;
        const sameNames =
          (existing.to || existing.recipientName || '').trim().toLowerCase() === itemToNorm &&
          (existing.from || existing.senderName || '').trim().toLowerCase() === itemFromNorm;
        return withinWindow && sameNames;
      });

    seenCodes.add(item.code);
    if (!isSupersededDraft) {
      result.push(item);
    }
  }
  return result;
}

function persistVaultListSafely(list: SavedVaultBouquet[]): void {
  inMemoryVaultCache = list;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // QuotaExceededError fallback: strip heavy inline audio dataURLs from localStorage copy while keeping full visual draftPayload
    try {
      const slimmed = list.map((item) => ({
        ...item,
        draftPayload: stripInlineAudioFromPayload(item.draftPayload),
      }));
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(slimmed));
    } catch {
      // Final fallback: keep most recent 12 visual payloads (with photos stripped on older entries if needed)
      try {
        const minimal = list.slice(0, 15).map((item, idx) => ({
          ...item,
          draftPayload:
            idx < 6
              ? stripInlineAudioFromPayload(item.draftPayload)
              : stripInlinePhotosFromCompactPayload(item.draftPayload),
        }));
        localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(minimal));
      } catch {
        // Ignore storage write failure; inMemoryVaultCache still holds full session state
      }
    }
  }
}

export function getSavedVaultBouquets(): SavedVaultBouquet[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) return inMemoryVaultCache ? deduplicateVaultList(inMemoryVaultCache) : [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return inMemoryVaultCache || [];
    // Merge any richer in-memory draftPayload from the current session
    const merged = parsed.map((item: SavedVaultBouquet) => {
      const memMatch = inMemoryVaultCache?.find((m) => m.code === item.code);
      if (memMatch && memMatch.draftPayload && (!item.draftPayload || memMatch.draftPayload.length > item.draftPayload.length)) {
        return { ...item, draftPayload: memMatch.draftPayload };
      }
      return item;
    });
    const cleaned = deduplicateVaultList(merged);
    if (cleaned.length !== parsed.length) {
      persistVaultListSafely(cleaned);
    } else {
      inMemoryVaultCache = cleaned;
    }
    return cleaned;
  } catch {
    return inMemoryVaultCache || [];
  }
}

export function saveBouquetToLocalVault(
  entry: SavedVaultBouquet,
  replaceCode?: string | null
): SavedVaultBouquet[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getSavedVaultBouquets().filter(
      (b) => b.code !== entry.code && (!replaceCode || b.code !== replaceCode)
    );
    const next = deduplicateVaultList([entry, ...existing]).slice(0, 30);
    persistVaultListSafely(next);
    return next;
  } catch {
    return inMemoryVaultCache || [];
  }
}

export function removeBouquetFromLocalVault(code: string): SavedVaultBouquet[] {
  if (typeof window === 'undefined') return [];
  try {
    const next = getSavedVaultBouquets().filter((b) => b.code !== code);
    persistVaultListSafely(next);
    return next;
  } catch {
    return inMemoryVaultCache || [];
  }
}

const GARLAND_FEED_DOC_CODE = 'sab_garland_feed_v1';
const GARLAND_FEED_IMMUTABLE_CREATED_AT = '2026-11-08T00:00:00.000Z';
const GARLAND_FEED_IMMUTABLE_PAYLOAD = '#sab_garland_feed_v1';

export async function fetchGlobalGarlandFeedFromFirestore(): Promise<SavedVaultBouquet[]> {
  try {
    const snap = await getDoc(doc(db, 'shared_bouquets', GARLAND_FEED_DOC_CODE));
    if (!snap.exists()) return [];
    const data = snap.data() as Partial<SharedBouquetRecord>;
    if (!data?.voiceAudioDataUrl) return [];
    const parsed = JSON.parse(data.voiceAudioDataUrl);
    if (!Array.isArray(parsed)) return [];
    return deduplicateVaultList(
      parsed.filter((item) => item && typeof item.code === 'string' && !item.isDraft && item.pinToShowcase !== false)
    );
  } catch {
    return [];
  }
}

export async function publishBouquetToGlobalGarlandFeed(
  entry: SavedVaultBouquet,
  replaceCode?: string | null
): Promise<boolean> {
  if (!entry || !entry.code || entry.isDraft || entry.pinToShowcase === false) return false;
  if (entry.lockMode && entry.lockMode !== 'none') return false;
  try {
    const feedDocRef = doc(db, 'shared_bouquets', GARLAND_FEED_DOC_CODE);
    const snap = await getDoc(feedDocRef);
    const snapData = snap.exists() ? (snap.data() as Partial<SharedBouquetRecord>) : null;
    const preservedCreatedAt =
      snapData && typeof snapData.createdAt === 'string' && snapData.createdAt.length >= 10
        ? snapData.createdAt
        : GARLAND_FEED_IMMUTABLE_CREATED_AT;
    const preservedPayload =
      snapData && typeof snapData.payload === 'string' && snapData.payload.length >= 3
        ? snapData.payload
        : GARLAND_FEED_IMMUTABLE_PAYLOAD;

    let existing: SavedVaultBouquet[] = [];
    if (snapData?.voiceAudioDataUrl) {
      try {
        const parsed = JSON.parse(snapData.voiceAudioDataUrl);
        if (Array.isArray(parsed)) {
          existing = deduplicateVaultList(
            parsed.filter(
              (item) => item && typeof item.code === 'string' && !item.isDraft && item.pinToShowcase !== false
            )
          );
        }
      } catch {
        existing = [];
      }
    }

    const compactEntry: SavedVaultBouquet = {
      ...entry,
      isDraft: false,
      pinToShowcase: true,
      draftPayload: stripInlineAudioFromPayload(entry.draftPayload),
    };
    const filtered = existing.filter(
      (b) => b.code !== compactEntry.code && (!replaceCode || b.code !== replaceCode)
    );
    let merged = deduplicateVaultList([compactEntry, ...filtered]).slice(0, 24);
    let jsonStr = JSON.stringify(merged);

    // If multiple photo-heavy bouquets push the feed index over 720KB, strip inline photo base64
    // from older feed index summaries (full photos & voice remain stored in `shared_bouquets/{code}`)
    if (jsonStr.length > 720_000) {
      merged = merged.map((item, idx) => ({
        ...item,
        draftPayload:
          idx < 3
            ? stripInlineAudioFromPayload(item.draftPayload)
            : stripInlinePhotosFromCompactPayload(item.draftPayload),
      }));
      jsonStr = JSON.stringify(merged);
    }
    if (jsonStr.length > 880_000) {
      merged = merged.map((item) => ({
        ...item,
        draftPayload: stripInlinePhotosFromCompactPayload(item.draftPayload),
      }));
      jsonStr = JSON.stringify(merged);
    }
    if (jsonStr.length > 880_000) return false;

    await setDoc(feedDocRef, {
      code: GARLAND_FEED_DOC_CODE,
      payload: preservedPayload,
      createdAt: preservedCreatedAt,
      voiceAudioDataUrl: jsonStr,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes a bouquet from Firestore (`shared_bouquets/{code}`) and removes it from
 * the global Lace Garland feed (`sab_garland_feed_v1`) when the user deletes it.
 */
export async function removeBouquetFromFirestoreAndGarland(code: string): Promise<void> {
  if (!code || !CODE_REGEX.test(code) || code === GARLAND_FEED_DOC_CODE) return;
  try {
    await deleteDoc(doc(db, 'shared_bouquets', code)).catch(() => {});
  } catch {
    // Ignore if document doesn't exist
  }
  try {
    const feedDocRef = doc(db, 'shared_bouquets', GARLAND_FEED_DOC_CODE);
    const snap = await getDoc(feedDocRef);
    if (!snap.exists()) return;
    const snapData = snap.data() as Partial<SharedBouquetRecord>;
    if (!snapData?.voiceAudioDataUrl) return;
    const parsed = JSON.parse(snapData.voiceAudioDataUrl);
    if (!Array.isArray(parsed)) return;
    const existing = deduplicateVaultList(
      parsed.filter((item) => item && typeof item.code === 'string' && !item.isDraft && item.pinToShowcase !== false)
    );
    const filtered = existing.filter((b) => b.code !== code);
    if (filtered.length !== existing.length) {
      const jsonStr = JSON.stringify(filtered);
      if (jsonStr.length <= 880_000) {
        const preservedCreatedAt =
          typeof snapData.createdAt === 'string' && snapData.createdAt.length >= 10
            ? snapData.createdAt
            : GARLAND_FEED_IMMUTABLE_CREATED_AT;
        const preservedPayload =
          typeof snapData.payload === 'string' && snapData.payload.length >= 3
            ? snapData.payload
            : GARLAND_FEED_IMMUTABLE_PAYLOAD;
        await setDoc(feedDocRef, {
          code: GARLAND_FEED_DOC_CODE,
          payload: preservedPayload,
          createdAt: preservedCreatedAt,
          voiceAudioDataUrl: jsonStr,
        });
      }
    }
  } catch {
    // Ignore background feed cleanup errors
  }
}

const PASS_KEY_DOC_REGEX = /^BLOOM-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

export async function saveStudioPassToFirestore(pass: {
  passKey: string;
  tier: string;
  region: string;
  createdAt: string;
  expiresAt: string;
  retentionDays: number;
  isEternalKeepsake: boolean;
  primaryDeviceHash: string;
  secondaryDeviceHash: string | null;
  activeSessionNonce: string;
  boundBouquetCode: string | null;
  dailyUsageDate: string;
  dailyUsageCount: number;
  paymentProvider: string;
  paymentReference: string;
  signature: string;
}): Promise<boolean> {
  if (!pass || !PASS_KEY_DOC_REGEX.test(pass.passKey)) return false;
  try {
    const docRef = doc(db, 'studio_passes', pass.passKey);
    await setDoc(docRef, {
      passKey: pass.passKey,
      tier: pass.tier,
      region: pass.region,
      createdAt: pass.createdAt,
      expiresAt: pass.expiresAt,
      retentionDays: pass.retentionDays,
      isEternalKeepsake: Boolean(pass.isEternalKeepsake),
      primaryDeviceHash: pass.primaryDeviceHash,
      secondaryDeviceHash: pass.secondaryDeviceHash || '',
      activeSessionNonce: pass.activeSessionNonce,
      boundBouquetCode: pass.boundBouquetCode || '',
      dailyUsageDate: pass.dailyUsageDate,
      dailyUsageCount: pass.dailyUsageCount,
      paymentProvider: pass.paymentProvider,
      paymentReference: pass.paymentReference,
      signature: pass.signature,
    });
    return true;
  } catch {
    return false;
  }
}

export async function fetchStudioPassFromFirestore(
  passKey: string
): Promise<Record<string, unknown> | null> {
  if (!passKey || !PASS_KEY_DOC_REGEX.test(passKey)) return null;
  try {
    const snap = await getDoc(doc(db, 'studio_passes', passKey));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      ...d,
      secondaryDeviceHash: d.secondaryDeviceHash || null,
      boundBouquetCode: d.boundBouquetCode || null,
    };
  } catch {
    return null;
  }
}

