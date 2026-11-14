import type { BouquetLockConfig, BouquetPasscodeType } from '../types/bouquet';

export const DEFAULT_PIN_HINT = 'Our special date (MMDD)';
export const DEFAULT_WORD_HINT = 'A secret word only we know';

/**
 * Strips all non-numeric characters and caps at 4 digits for numerical PIN locks.
 */
export function sanitizeSecretPinInput(raw: string): string {
  return String(raw || '').replace(/\D/g, '').slice(0, 4);
}

/**
 * Keeps only Unicode letters and spaces (collapsing consecutive spaces while typing)
 * for pure Secret Word answers so dates/numbers/punctuation ambiguity cannot occur.
 */
export function sanitizeSecretWordInput(raw: string): string {
  return String(raw || '')
    .replace(/[^\p{L}\s]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 40);
}

/**
 * Resolves the effective Secret Hint mode ('pin' vs 'word') while remaining 100%
 * backwards-compatible with legacy shared bouquets where passcodeType was omitted.
 */
export function resolveEffectivePasscodeType(
  lock: Pick<BouquetLockConfig, 'passcodeType' | 'passcodeAnswer'> | undefined
): BouquetPasscodeType {
  if (lock?.passcodeType === 'pin' || lock?.passcodeType === 'word') {
    return lock.passcodeType;
  }
  const trimmed = (lock?.passcodeAnswer || '').trim();
  if (/^\d{4}$/.test(trimmed)) {
    return 'pin';
  }
  return 'word';
}

export function normalizeSecretAnswerForCompare(
  raw: string,
  passcodeType?: BouquetPasscodeType
): string {
  if (passcodeType === 'pin') {
    return sanitizeSecretPinInput(raw);
  }
  return String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function isSecretAnswerMatch(
  expectedRaw: string | undefined,
  attemptRaw: string,
  passcodeType?: BouquetPasscodeType
): boolean {
  const trimmedExpected = (expectedRaw || '').trim();
  if (!trimmedExpected) return true;

  const effectiveType = passcodeType || (/^\d{4}$/.test(trimmedExpected) ? 'pin' : 'word');
  if (effectiveType === 'pin') {
    const expectedPin = sanitizeSecretPinInput(trimmedExpected);
    const attemptPin = sanitizeSecretPinInput(attemptRaw);
    return expectedPin.length === 4 && attemptPin === expectedPin;
  }

  return (
    normalizeSecretAnswerForCompare(attemptRaw, 'word') ===
    normalizeSecretAnswerForCompare(trimmedExpected, 'word')
  );
}

export interface LockValidationResult {
  valid: boolean;
  error?: string;
}

export function validateBouquetLockConfig(
  lock: BouquetLockConfig | undefined
): LockValidationResult {
  if (!lock || lock.mode === 'none') {
    return { valid: true };
  }

  if (lock.mode === 'countdown') {
    if (!lock.unlockAtIso || !Number.isFinite(new Date(lock.unlockAtIso).getTime())) {
      return {
        valid: false,
        error: 'Please pick a valid unlock date and time.',
      };
    }
    return { valid: true };
  }

  const effectiveType = resolveEffectivePasscodeType(lock);
  if (effectiveType === 'pin') {
    const pin = sanitizeSecretPinInput(lock.passcodeAnswer || '');
    if (pin.length !== 4) {
      return {
        valid: false,
        error: 'Please enter a 4-digit PIN (numbers 0–9 only).',
      };
    }
    return { valid: true };
  }

  const word = sanitizeSecretWordInput(lock.passcodeAnswer || '').trim();
  if (!word) {
    return {
      valid: false,
      error: 'Please enter a secret word (letters only).',
    };
  }
  return { valid: true };
}
