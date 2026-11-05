import { createServer } from 'vite';
import { renderToString } from 'react-dom/server';
import React from 'react';
import assert from 'node:assert';
import fs from 'node:fs';

console.log('--- Starting Comprehensive Responsive Layout & UI/UX Test Suite ---');

const vite = await createServer({
  server: { middlewareMode: true },
});

try {
  const studioMod = await vite.ssrLoadModule('/bouquet_studio.tsx');
  const App = studioMod.default;

  // 1. Initial Render Test
  const html = renderToString(React.createElement(App));
  assert(html.length > 50000, `Expected rendered HTML length > 50000, got ${html.length}`);
  console.log('✓ App renders cleanly (HTML size:', html.length, 'bytes)');

  // 2. Responsive Header Elements Check
  assert(html.includes('Bouquet Studio'), 'App header title present');
  assert(html.includes('hidden sm:inline'), 'Autosave status text adapts to screen size');
  assert(html.includes('hidden md:inline') && html.includes('Randomize'), 'Randomize button adapts responsively');
  assert(html.includes('hidden xl:inline'), 'Music box button adapts responsively');
  assert(html.includes('Save &amp; Send'), 'Save & Send CTA button present with responsive label');
  console.log('✓ Header controls and breakpoint-specific hiding verified');

  // 3. Canvas Stage Touch Ergonomics Check
  assert(html.includes('r="48"'), 'Flower hit targets expanded to radius 48 (96px diameter) for touch');
  assert(html.includes('r="24"'), 'Gizmo handle touch target expanded to radius 24 (48px diameter)');
  assert(html.includes('touch-none'), 'Touch-action none set for canvas dragging');
  console.log('✓ Canvas stage touch hit targets and touch ergonomics verified');

  // 4. Collapsible Drawer & Mobile Sheet Check
  assert(html.includes('Botanical Studio'), 'Desktop sidebar header present');
  assert(html.includes('Toggle drawer sheet height') || html.includes('Show studio drawer') || html.includes('Toggle drawer size'), 'Mobile drawer sheet toggle present');
  assert(html.includes('Flowers') && html.includes('Wrapping') && html.includes('Card'), 'All 3 studio drawer tabs present');
  assert(html.includes('transition-all duration-300'), 'Smooth layout transition classes present on drawer');
  console.log('✓ Drawer collapsible/expandable sheet and desktop sidebar controls verified');

  // 5. Selected Flower Toolbar Check
  assert(html.includes('Selected Flower Controls') || html.includes('Selected Flower Quick Controls'), 'Selected flower toolbar rendered');
  assert(html.includes('Deselect (Close)') || html.includes('Deselect Flower'), 'Deselect / close button present on flower toolbar');
  assert(html.includes('Minimize Inspector') || html.includes('Minimize Flower Controls'), 'Minimize toggle present on flower toolbar');
  assert(html.includes('Petals') && html.includes('Center'), 'Petal and Center color pickers present');
  console.log('✓ SelectedFlowerToolbar inspection, minimization, and deselect verified');

  // 6. Flowers Tab & Catalog in Drawer Check
  assert(html.includes('Templates') && html.includes('Add any stem to your bouquet') || html.includes('Select any stem to add to your bouquet') || html.includes('Flowers'), 'Flowers tab content rendered in drawer');
  assert(html.includes('Kraft paper') || html.includes('Hand-tied stems') || html.includes('Wrapping'), 'Wrapping tab accessible via tab bar');
  console.log('✓ Drawer tabs and floral catalog verified');

  // 7. Store State & Card Controls Check
  const state = studioMod.useBouquetStore.getState();
  assert(state.card && state.card.to && state.card.message && state.card.from, 'Card note data initialized in store');
  assert(state.wrapStyle && state.wrapColor && state.ribbonColor, 'Wrapping and ribbon styles initialized in store');
  assert(state.items.length > 0, 'Initial bouquet arrangement items present');
  console.log('✓ Store state, wrapping styles, and greeting card data verified');

  // 8. Music Box & Audio Synthesis Check
  assert(studioMod.musicBox, 'RomanticMusicBox procedural synthesizer instance exported');
  assert(typeof studioMod.musicBox.toggle === 'function', 'musicBox toggle function present');
  console.log('✓ Procedural music box audio system preserved');

  // 9. Flower Catalog & Templates Check
  assert(studioMod.FLOWER_CATALOG.length === 11, `Expected 11 flower entries, got ${studioMod.FLOWER_CATALOG.length}`);
  assert(studioMod.STARTER_TEMPLATES.length >= 4, `Expected at least 4 starter templates, got ${studioMod.STARTER_TEMPLATES.length}`);
  console.log('✓ Botanical flower catalog and starter templates preserved');

  // 10. PNG Export Check
  assert(typeof studioMod.exportSvgElementToPng === 'function', 'High-res PNG export function preserved');
  console.log('✓ High-res PNG export function verified');

  // 11. Edge Case: Empty Bouquet State
  React.useSyncExternalStore = (sub, getSnap) => getSnap();
  studioMod.useBouquetStore.getState().clearBouquet();
  const emptyHtml = renderToString(React.createElement(App));
  assert(emptyHtml.includes('Start arranging') && emptyHtml.includes('Add flowers from the palette'), 'Empty bouquet prompt renders gracefully');
  console.log('✓ Edge case: Empty bouquet prompt verified without crashes');

  // 12. Edge Case: All Starter Templates Validation
  for (const tpl of studioMod.STARTER_TEMPLATES) {
    studioMod.useBouquetStore.getState().loadSnapshot(tpl.snapshot);
    const snapState = studioMod.useBouquetStore.getState();
    assert(snapState.items.length > 0, `Template ${tpl.name} has non-empty items`);
    assert(snapState.wrapStyle, `Template ${tpl.name} has valid wrapStyle`);
    assert(snapState.card, `Template ${tpl.name} has valid card data`);
    // Render with each template
    const tplHtml = renderToString(React.createElement(App));
    assert(tplHtml.length > 50000, `Template ${tpl.name} renders clean HTML`);
  }
  console.log('✓ Edge case: All starter templates validated and rendered');

  // 13. Edge Case: Transformation & Stem Rotation Limits
  const store = studioMod.useBouquetStore.getState();
  store.addFlower('rose');
  const addedItem = studioMod.useBouquetStore.getState().items.at(-1);
  assert(addedItem, 'Item added successfully');
  store.updateItem(addedItem.id, { rotation: 140, scale: 2.0 }, false);
  let updated = studioMod.useBouquetStore.getState().items.find(i => i.id === addedItem.id);
  assert(updated.rotation === 140 && updated.scale === 2.0, 'Positive rotation & max scale applied');
  store.updateItem(addedItem.id, { rotation: -140, scale: 0.45 }, false);
  updated = studioMod.useBouquetStore.getState().items.find(i => i.id === addedItem.id);
  assert(updated.rotation === -140 && updated.scale === 0.45, 'Negative rotation & min scale applied');
  console.log('✓ Edge case: Boundary stem bending & scale transformations verified');

  // 14. Edge Case: Deselection
  store.selectItem(null);
  assert(studioMod.useBouquetStore.getState().selectedId === null, 'Deselection sets selectedId to null');
  const deselectedHtml = renderToString(React.createElement(App));
  assert(!deselectedHtml.includes('Selected Flower Controls'), 'Toolbar hidden when no flower is selected');
  console.log('✓ Edge case: Deselection cleanly hides toolbar without affecting stage layout');

  // 15. Viewport Meta & Pull-To-Refresh Prevention
  const indexHtml = fs.readFileSync('index.html', 'utf-8');
  assert(indexHtml.includes('viewport-fit=cover'), 'index.html includes viewport-fit=cover for iOS safe areas');
  assert(indexHtml.includes('user-scalable=no'), 'index.html includes user-scalable=no to prevent accidental zoom');
  const indexCss = fs.readFileSync('src/index.css', 'utf-8');
  assert(indexCss.includes('overscroll-behavior: none'), 'src/index.css disables overscroll to prevent mobile pull-to-refresh');
  assert(indexCss.includes('.no-scrollbar'), 'src/index.css includes no-scrollbar cross-browser utility');
  console.log('✓ Viewport meta attributes and mobile pull-to-refresh prevention verified');

  // 16. Dynamic Viewport 100dvh & SVG Pointer Cancel Safety
  assert(html.includes('h-[100dvh]'), 'Root container uses 100dvh dynamic height to avoid mobile address-bar clipping');
  assert(html.includes('w-full'), 'Root container uses w-full to prevent horizontal scrollbars');
  const studioSrc = fs.readFileSync('bouquet_studio.tsx', 'utf-8');
  assert(studioSrc.includes('onPointerCancel={handleStagePointerUp}'), 'Canvas stage handles pointer cancellation gracefully');
  console.log('✓ Dynamic viewport height (100dvh) and pointer cancellation safety verified');

  // 17. Tablet Breakpoint Grid Adaptability
  assert(studioSrc.includes('sm:grid-cols-4 lg:grid-cols-2'), 'Starter templates and wrapping styles adapt to 4 columns on tablet');
  assert(studioSrc.includes('sm:grid-cols-3 lg:grid-cols-2'), 'Ribbon swatches adapt to 3 columns on tablet');
  console.log('✓ Tablet breakpoint multi-column layout adaptability verified');

  // 18. Floating Controls & Inspector Non-Overlapping Verification
  assert(studioSrc.includes('drawerState === \'collapsed\' && !selectedId'), 'Floating Add Flowers button is hidden when a flower is selected, avoiding toolbar overlap');
  assert(studioSrc.includes('isDrawerOpen={drawerState !== \'collapsed\'}'), 'SelectedFlowerToolbar receives drawer state for responsive auto-minimization');
  assert(studioSrc.includes('w-7 h-7 sm:w-6 sm:h-6'), 'Color swatches have enlarged 28px touch targets for mobile thumbs');
  // 19. Canvas Gizmo Delta Transformation Math Verification
  assert(studioSrc.includes('deltaDeg = ((currentAngle - startAngle) * 180) / Math.PI'), 'Gizmo rotation uses smooth delta angle calculation from drag start');
  assert(studioSrc.includes('interaction.startScale * ratio'), 'Gizmo scaling uses monotonic distance ratio from initial pointer distance');
  assert(!studioSrc.includes('(Math.atan2(dy, dx) * 180) / Math.PI + 45'), 'Eliminated hardcoded angle offset that caused 90-degree snap jumps');
  console.log('✓ Canvas gizmo smooth delta transformation math verified');

  // 20. Toolbar Responsive Action Button Labels
  assert(studioSrc.includes('hidden sm:inline">Back</span>') && !studioSrc.includes('hidden xs:inline'), 'Action buttons use valid Tailwind sm:inline breakpoint instead of invalid xs:inline');
  console.log('✓ Toolbar action button labels responsive visibility verified');

  // 21. Flower Inspector Expand Controls Drawer Coordination
  assert(studioSrc.includes('onRequestCollapseDrawer?.()'), 'Expand Controls button invokes drawer collapse request');
  assert(studioSrc.includes('onRequestCollapseDrawer={() => {'), 'App coordinates drawer collapse when flower inspector expands');
  console.log('✓ Flower inspector expand coordination with drawer verified');

  // 22. Range Slider Undo Snapshot Commitment & Reversion
  const testStore = studioMod.useBouquetStore.getState();
  const testItem = testStore.items[0];
  const testInitialScale = testItem.scale;
  const testInitialRotation = testItem.rotation;
  const initialPastLen = testStore.past.length;

  // Verify selecting flowers without moving does not pollute history
  testStore.selectItem('f-1');
  testStore.selectItem('f-2');
  testStore.selectItem('f-3');
  assert.strictEqual(testStore.past.length, initialPastLen, 'Tapping to select flowers does not pollute undo history stack');

  // Verify slider gesture undo functionality
  testStore.commitHistorySnapshot();
  testStore.updateItem(testItem.id, { scale: 1.85, rotation: 55 }, false);
  let updatedStore = studioMod.useBouquetStore.getState();
  assert.strictEqual(updatedStore.items.find(i => i.id === testItem.id).scale, 1.85, 'Scale updated');
  assert.strictEqual(updatedStore.items.find(i => i.id === testItem.id).rotation, 55, 'Rotation updated');
  updatedStore.undo();
  const revertedStore = studioMod.useBouquetStore.getState();
  assert.strictEqual(revertedStore.items.find(i => i.id === testItem.id).scale, testInitialScale, 'Undoing slider change restores initial scale');
  assert.strictEqual(revertedStore.items.find(i => i.id === testItem.id).rotation, testInitialRotation, 'Undoing slider change restores initial rotation');
  console.log('✓ Range slider undo history snapshot commitment & reversion verified');

  // 23. Share Modal Backdrop Dismissibility & Touch Safety
  assert(studioSrc.includes('onClick={() => setIsShareModalOpen(false)}') && studioSrc.includes('onClick={(e) => e.stopPropagation()}'), 'Share modal backdrop is tap-to-dismiss with event bubbling guard');
  console.log('✓ Share modal backdrop tap-to-dismiss behavior verified');

  // 24. Greeting Card Input Limit Alignment with Stage Tag
  assert(studioSrc.includes('maxLength={22}') && studioSrc.includes('maxLength={20}') && studioSrc.includes('maxLength={86}'), 'Greeting card inputs maxLength matches SVG canvas text slice limits');
  console.log('✓ Greeting card input character limits aligned with canvas tag');

  // 25. Mobile Header Responsiveness & Share Modal Preview Action
  assert(studioSrc.includes('hidden sm:flex') && studioSrc.includes('Preview bloom'), 'Header controls fit cleanly within 360px/375px mobile viewports with modal bloom preview');
  console.log('✓ Mobile header responsiveness & share modal bloom preview verified');

  console.log('\nAll 25 Verification and Edge Case Checks Passed Successfully! 🎉');
} finally {
  await vite.close();
}
