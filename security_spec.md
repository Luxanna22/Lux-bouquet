# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Path & Document ID Integrity**: Every document in `/shared_bouquets/{code}` must have a valid alphanumeric short code (`^[a-zA-Z0-9_\-]{7,24}$`) where the inner `code` field matches the document ID `code`.
2. **Strict Schema & Volumetric Bounds**: `SharedBouquet` documents must contain only allowed keys (`code`, `payload`, `voiceAudioDataUrl`, `voiceStyle`, `voiceTitle`, `voiceDurationSec`, `createdAt`), with strict string length bounds (`payload` <= 900,000 chars, `voiceAudioDataUrl` <= 900,000 chars, `voiceStyle` <= 32 chars, `voiceTitle` <= 64 chars) and numeric bounds (`voiceDurationSec` >= 0 && <= 600).
3. **Temporal Integrity**: `createdAt` must equal `request.time` upon creation and remain immutable.
4. **No Collection Scraping (`list` Denied)**: Recipients only look up a specific bouquet by its exact secret short code (`get`). Blanket `list` queries and `delete` operations are denied (`allow list, delete: if false;`).

## 2. The "Dirty Dozen" Payloads
1. **Ghost Field Injection**: Adding `{"isAdmin": true}` to `/shared_bouquets/AbCdEf12345678` -> `PERMISSION_DENIED`.
2. **ID Mismatch Spoof**: Writing `{"code": "OtherCode12345"}` to `/shared_bouquets/AbCdEf12345678` -> `PERMISSION_DENIED`.
3. **ID Poisoning**: Document ID exceeding 24 characters or containing invalid symbols (`$`, `/`, spaces) -> `PERMISSION_DENIED`.
4. **Missing Required Field (`payload`)**: Creating a document without `payload` -> `PERMISSION_DENIED`.
5. **Missing Server Timestamp (`createdAt`)**: Providing a forged client timestamp or string for `createdAt` -> `PERMISSION_DENIED`.
6. **Oversized Payload Attack**: `payload` exceeding 900,000 characters -> `PERMISSION_DENIED`.
7. **Invalid Audio Format**: `voiceAudioDataUrl` not starting with `data:audio/` when non-empty -> `PERMISSION_DENIED`.
8. **Negative or Excessive Duration**: `voiceDurationSec` < 0 or > 600 -> `PERMISSION_DENIED`.
9. **Type Confusion on `voiceTitle`**: Passing a number or boolean for `voiceTitle` -> `PERMISSION_DENIED`.
10. **Unauthorized Collection Listing**: Calling `getDocs(collection(db, 'shared_bouquets'))` to scrape all shared bouquets -> `PERMISSION_DENIED`.
11. **Unauthorized Deletion**: Calling `deleteDoc(doc(db, 'shared_bouquets', code))` -> `PERMISSION_DENIED`.
12. **Immutable Timestamp Mutation**: Attempting to modify `createdAt` or `code` during an update -> `PERMISSION_DENIED`.
