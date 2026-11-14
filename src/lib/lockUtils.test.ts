import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSecretAnswerMatch,
  resolveEffectivePasscodeType,
  sanitizeSecretPinInput,
  sanitizeSecretWordInput,
  validateBouquetLockConfig,
} from './lockUtils';

test('sanitizeSecretPinInput enforces numerical-only 4-digit PINs', () => {
  assert.equal(sanitizeSecretPinInput('10-14-2026'), '1014');
  assert.equal(sanitizeSecretPinInput('ab12cd34ef56'), '1234');
  assert.equal(sanitizeSecretPinInput('042'), '042');
});

test('sanitizeSecretWordInput accepts pure letters and single spaces without numbers or symbols', () => {
  assert.equal(sanitizeSecretWordInput('Mochi123!'), 'Mochi');
  assert.equal(sanitizeSecretWordInput('  Sweet   Pea  '), ' Sweet Pea ');
  assert.equal(sanitizeSecretWordInput('Café Crème'), 'Café Crème');
});

test('isSecretAnswerMatch handles 4-digit PINs and case-insensitive Secret Words cleanly', () => {
  assert.equal(isSecretAnswerMatch('1014', '1014', 'pin'), true);
  assert.equal(isSecretAnswerMatch('1014', '1015', 'pin'), false);
  assert.equal(isSecretAnswerMatch('1014', '101', 'pin'), false);

  assert.equal(isSecretAnswerMatch('Mochi', 'mochi', 'word'), true);
  assert.equal(isSecretAnswerMatch('Sweet Pea', '  sweet   PEA ', 'word'), true);
  assert.equal(isSecretAnswerMatch('Mochi', 'Matcha', 'word'), false);

  // Backwards compatibility when passcodeType is undefined on legacy bouquets
  assert.equal(resolveEffectivePasscodeType({ passcodeAnswer: '0725' }), 'pin');
  assert.equal(resolveEffectivePasscodeType({ passcodeAnswer: 'October' }), 'word');
  assert.equal(isSecretAnswerMatch('October', 'october'), true);
  assert.equal(isSecretAnswerMatch('0725', '0725'), true);
});

test('validateBouquetLockConfig blocks incomplete PIN or empty Secret Word', () => {
  assert.equal(validateBouquetLockConfig({ mode: 'none' }).valid, true);

  const shortPin = validateBouquetLockConfig({
    mode: 'passcode',
    passcodeType: 'pin',
    passcodeAnswer: '101',
  });
  assert.equal(shortPin.valid, false);
  assert.match(shortPin.error || '', /4-digit PIN/);

  const validPin = validateBouquetLockConfig({
    mode: 'passcode',
    passcodeType: 'pin',
    passcodeAnswer: '1014',
  });
  assert.equal(validPin.valid, true);

  const emptyWord = validateBouquetLockConfig({
    mode: 'passcode',
    passcodeType: 'word',
    passcodeAnswer: '1234',
  });
  assert.equal(emptyWord.valid, false);

  const validWord = validateBouquetLockConfig({
    mode: 'passcode',
    passcodeType: 'word',
    passcodeAnswer: 'Sunflowers',
  });
  assert.equal(validWord.valid, true);
});
