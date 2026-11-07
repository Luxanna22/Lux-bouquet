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
import { BouquetSnapshot } from '../types/bouquet';

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
    tenantId?: string | null;
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
  createdAt: string;
}

const CODE_REGEX = /^[a-zA-Z0-9_\-]{7,24}$/;

export async function saveSharedBouquetToFirestore(
  code: string,
  payload: string,
  snapshot?: BouquetSnapshot
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

    const record: SharedBouquetRecord = {
      code,
      payload: payload.slice(0, 900000),
      createdAt:
        existingData &&
        typeof existingData.createdAt === 'string' &&
        existingData.createdAt.length >= 10
          ? existingData.createdAt
          : new Date().toISOString()
    };

    const voice = snapshot?.voice;
    if (voice?.audioDataUrl && voice.audioDataUrl.length <= 900000) {
      record.voiceAudioDataUrl = voice.audioDataUrl;
    }
    if (voice?.style) {
      record.voiceStyle = String(voice.style).slice(0, 32);
    }
    if (voice?.title) {
      record.voiceTitle = String(voice.title).slice(0, 64);
    }
    if (typeof voice?.durationSec === 'number' && Number.isFinite(voice.durationSec)) {
      record.voiceDurationSec = Math.max(0, Math.min(600, Math.round(voice.durationSec)));
    }

    await setDoc(docRef, record);
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
