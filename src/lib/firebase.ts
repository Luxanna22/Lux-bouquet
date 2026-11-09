import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { BouquetSnapshot, SavedVaultBouquet } from '../types/bouquet';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

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
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

if (typeof window !== 'undefined') {
  const testConnection = async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error('Please check your Firebase configuration.');
      }
    }
  };
  testConnection();
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
  if (!payload || payload.length < 3 || payload.length > 900000) return false;

  const docPath = `shared_bouquets/${code}`;
  const docRef = doc(db, 'shared_bouquets', code);

  try {
    const existingSnap = await getDoc(docRef);
    const existingData = existingSnap.exists()
      ? (existingSnap.data() as Partial<SharedBouquetRecord>)
      : null;

    const voice = snapshot?.voice;
    const record = sanitizeRecordForFirestore(
      existingData,
      {
        payload,
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

function deduplicateVaultList(list: SavedVaultBouquet[]): SavedVaultBouquet[] {
  const seenCodes = new Set<string>();
  const result: SavedVaultBouquet[] = [];

  for (const item of list) {
    if (!item || typeof item.code !== 'string') continue;
    if (seenCodes.has(item.code)) continue;

    // Collapse rapid-fire edits of the same bouquet (same recipient, sender, flower count) saved within 15 minutes
    const itemTime = Date.parse(item.createdAt || '') || 0;
    const isRapidDuplicate = result.some((existing) => {
      const existingTime = Date.parse(existing.createdAt || '') || 0;
      const withinWindow = Math.abs(existingTime - itemTime) < 15 * 60 * 1000;
      return (
        withinWindow &&
        (existing.to || '') === (item.to || '') &&
        (existing.from || '') === (item.from || '') &&
        existing.flowerCount === item.flowerCount &&
        Boolean(existing.hasVoice) === Boolean(item.hasVoice)
      );
    });

    seenCodes.add(item.code);
    if (!isRapidDuplicate) {
      result.push(item);
    }
  }
  return result;
}

export function getSavedVaultBouquets(): SavedVaultBouquet[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cleaned = deduplicateVaultList(parsed);
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
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
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

export function removeBouquetFromLocalVault(code: string): SavedVaultBouquet[] {
  if (typeof window === 'undefined') return [];
  try {
    const next = getSavedVaultBouquets().filter((b) => b.code !== code);
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
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

