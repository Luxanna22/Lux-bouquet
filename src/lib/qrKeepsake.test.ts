import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBotanicalQrMatrix,
  isCenterLogoMedallionZone,
  isFinderPatternRegion,
  QR_STYLE_CATALOG,
  QR_THEME_CATALOG,
} from './qrKeepsake';

test('computeBotanicalQrMatrix generates ECC-H matrix with 3 custom finder origins and clear center medallion', () => {
  const url = 'https://sendabouquet.com/?g=abc123xyz';
  const matrix = computeBotanicalQrMatrix(url);

  assert.ok(matrix.size >= 21, `Expected QR matrix size >= 21, got ${matrix.size}`);
  assert.equal(matrix.finderOrigins.length, 3);
  assert.deepEqual(matrix.finderOrigins[0], { row: 0, col: 0 });
  assert.deepEqual(matrix.finderOrigins[1], { row: 0, col: matrix.size - 7 });
  assert.deepEqual(matrix.finderOrigins[2], { row: matrix.size - 7, col: 0 });
  assert.ok(matrix.cells.length > 50, 'Expected populated dark data cells');

  // Verify no data cells overlap finder patterns or center logo medallion
  for (const cell of matrix.cells) {
    assert.equal(
      isFinderPatternRegion(cell.row, cell.col, matrix.size),
      false,
      'Data cell must not overlap finder pattern region'
    );
    assert.equal(
      isCenterLogoMedallionZone(cell.row, cell.col, matrix.size),
      false,
      'Data cell must not overlap center logo medallion zone'
    );
  }

  assert.equal(QR_THEME_CATALOG.length, 4);
  assert.equal(QR_STYLE_CATALOG.length, 3);
});
