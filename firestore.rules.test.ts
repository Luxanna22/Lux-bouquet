/**
 * Firestore Security Rules Verification Specification (`firestore.rules.test.ts`)
 * Verifies that all "Dirty Dozen" adversarial payloads defined in `security_spec.md`
 * are rejected with PERMISSION_DENIED while valid shared bouquet operations succeed.
 */

export interface SecurityAssertionCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expected: 'ALLOW' | 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TEST_CASES: SecurityAssertionCase[] = [
  {
    id: 1,
    name: 'Ghost Field Injection',
    operation: 'create',
    path: '/shared_bouquets/AbCdEf123456789',
    payload: {
      code: 'AbCdEf123456789',
      payload: '#g=0.0.@0',
      createdAt: '2026-11-07T08:00:00.000Z',
      isAdmin: true
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 2,
    name: 'ID Mismatch Spoof',
    operation: 'create',
    path: '/shared_bouquets/AbCdEf123456789',
    payload: {
      code: 'OtherCode999999',
      payload: '#g=0.0.@0',
      createdAt: '2026-11-07T08:00:00.000Z'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 3,
    name: 'ID Poisoning (Too Short)',
    operation: 'create',
    path: '/shared_bouquets/abc',
    payload: {
      code: 'abc',
      payload: '#g=0.0.@0',
      createdAt: '2026-11-07T08:00:00.000Z'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 4,
    name: 'Missing Required Field (payload)',
    operation: 'create',
    path: '/shared_bouquets/AbCdEf123456789',
    payload: {
      code: 'AbCdEf123456789',
      createdAt: '2026-11-07T08:00:00.000Z'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 5,
    name: 'Missing Required Field (createdAt)',
    operation: 'create',
    path: '/shared_bouquets/AbCdEf123456789',
    payload: {
      code: 'AbCdEf123456789',
      payload: '#g=0.0.@0'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 6,
    name: 'Empty Payload String',
    operation: 'create',
    path: '/shared_bouquets/AbCdEf123456789',
    payload: {
      code: 'AbCdEf123456789',
      payload: '',
      createdAt: '2026-11-07T08:00:00.000Z'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 7,
    name: 'Invalid Audio Type',
    operation: 'create',
    path: '/shared_bouquets/AbCdEf123456789',
    payload: {
      code: 'AbCdEf123456789',
      payload: '#g=0.0.@0',
      voiceAudioDataUrl: 12345,
      createdAt: '2026-11-07T08:00:00.000Z'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 8,
    name: 'Negative Voice Duration',
    operation: 'create',
    path: '/shared_bouquets/AbCdEf123456789',
    payload: {
      code: 'AbCdEf123456789',
      payload: '#g=0.0.@0',
      voiceDurationSec: -10,
      createdAt: '2026-11-07T08:00:00.000Z'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 9,
    name: 'Type Confusion on voiceTitle',
    operation: 'create',
    path: '/shared_bouquets/AbCdEf123456789',
    payload: {
      code: 'AbCdEf123456789',
      payload: '#g=0.0.@0',
      voiceTitle: true,
      createdAt: '2026-11-07T08:00:00.000Z'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 10,
    name: 'Unauthorized Collection Listing (Scraping)',
    operation: 'list',
    path: '/shared_bouquets',
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 11,
    name: 'Unauthorized Document Deletion',
    operation: 'delete',
    path: '/shared_bouquets/AbCdEf123456789',
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 12,
    name: 'Immutable Timestamp Mutation on Update',
    operation: 'update',
    path: '/shared_bouquets/AbCdEf123456789',
    payload: {
      code: 'AbCdEf123456789',
      payload: '#g=0.0.@0',
      createdAt: '2099-01-01T00:00:00.000Z'
    },
    expected: 'PERMISSION_DENIED'
  }
];
