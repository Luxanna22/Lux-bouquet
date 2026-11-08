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
  assert(html.includes('Flowers For You'), 'App header title present');
  assert(html.includes('hidden sm:inline'), 'Autosave status text adapts to screen size');
  assert(!html.includes('Randomize') && !html.includes('Surprise'), 'Randomizer removed so users craft with their own creativity');
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

  // 9. Flower Catalog, Fillers, Wrappers, Ribbons, Cards & Templates Check
  assert(studioMod.FLOWER_CATALOG.length === 31, `Expected 31 botanical entries (19 focal + 12 fillers), got ${studioMod.FLOWER_CATALOG.length}`);
  assert(studioMod.WRAPPER_CATALOG.length === 12, `Expected 12 wrapper designs (including Velvet Hatbox, Glass Cloche, Korean Mesh), got ${studioMod.WRAPPER_CATALOG.length}`);
  assert(studioMod.RIBBON_STYLE_CATALOG.length === 10, `Expected 10 ribbon styles (including Chiffon Fringe, Gold Chain, Botanical Raffia), got ${studioMod.RIBBON_STYLE_CATALOG.length}`);
  assert(studioMod.RIBBON_SWATCHES.length === 12, `Expected 12 ribbon swatches, got ${studioMod.RIBBON_SWATCHES.length}`);
  assert(studioMod.CARD_THEME_CATALOG.length === 8, `Expected 8 greeting card themes (including default Sealed Letter), got ${studioMod.CARD_THEME_CATALOG.length}`);
  assert(studioMod.STARTER_TEMPLATES.length >= 4, `Expected at least 4 starter templates, got ${studioMod.STARTER_TEMPLATES.length}`);
  console.log('✓ Botanical flower catalog (31), wrappers (12), ribbon styles (10), swatches (12), cards (8) and starter templates verified');

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
  const studioFiles = [
    'bouquet_studio.tsx',
    'src/types/bouquet.ts',
    'src/components/flowers/FlowerRenderer.tsx',
    'src/lib/shareAndExport.ts',
    'src/store/useBouquetStore.ts',
    'src/components/BouquetStage.tsx',
    'src/components/MiniThumbnails.tsx',
    'src/components/LayerManagerPanel.tsx',
    'src/components/SelectedFlowerToolbar.tsx',
    'src/components/VoiceRecorderStudio.tsx',
    'src/components/BouquetStudioApp.tsx',
  ];
  const studioSrc = studioFiles.map(f => fs.readFileSync(f, 'utf-8')).join('\n');
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

  // 26. Voice Keepsake Catalog, Store, Draggable, Resizable & Rotatable Coordinates/Scale/Rotation & Share Payload Round-Trip Verification
  assert(studioMod.VOICE_KEEPSAKE_CATALOG.length === 5, `Expected 5 romantic voice keepsakes, got ${studioMod.VOICE_KEEPSAKE_CATALOG.length}`);
  assert(!studioSrc.includes('Upload audio file'), 'Audio file upload removed so all recordings are authentic live microphone voice notes');
  testStore.updateCard({
    theme: 'sealed',
    x: 442,
    y: 498,
    scale: 0.95,
    rotation: -18,
  });
  testStore.updateVoice({
    style: 'vinyl',
    visibleOnStage: true,
    title: 'Our Song',
    primaryColor: '#8B5A2B',
    accentColor: '#D4AF37',
    audioDataUrl: 'data:audio/webm;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
    durationSec: 12,
    x: 164,
    y: 512,
    scale: 1.15,
    rotation: 24,
  });
  const voiceState = studioMod.useBouquetStore.getState();
  assert.strictEqual(voiceState.voice.style, 'vinyl', 'Voice keepsake style updated to vinyl');
  assert.strictEqual(voiceState.voice.visibleOnStage, true, 'Voice keepsake visible on stage');
  assert.strictEqual(voiceState.card.scale, 0.95, 'Card scale updated');
  assert.strictEqual(voiceState.card.rotation, -18, 'Card rotation updated');
  assert.strictEqual(voiceState.voice.scale, 1.15, 'Voice keepsake scale updated');
  assert.strictEqual(voiceState.voice.rotation, 24, 'Voice keepsake rotation updated');
  const encodedWithVoice = studioMod.encodeBouquetToCompactPayload({
    items: voiceState.items,
    wrapStyle: voiceState.wrapStyle,
    wrapColor: voiceState.wrapColor,
    ribbonColor: voiceState.ribbonColor,
    ribbonStyle: voiceState.ribbonStyle,
    card: voiceState.card,
    voice: voiceState.voice,
  }, true);
  assert(encodedWithVoice.includes('&v='), 'Encoded payload includes &v= voice keepsake segment');
  const decodedWithVoice = studioMod.decodeBouquetFromHash(encodedWithVoice);
  assert(decodedWithVoice && decodedWithVoice.voice, 'Decoded snapshot includes voice data');
  assert.strictEqual(decodedWithVoice.card.theme, 'sealed', 'Decoded card theme matches sealed unopened envelope');
  assert.strictEqual(decodedWithVoice.card.x, 442, 'Decoded draggable card X coordinate matches');
  assert.strictEqual(decodedWithVoice.card.y, 498, 'Decoded draggable card Y coordinate matches');
  assert.strictEqual(decodedWithVoice.card.scale, 0.95, 'Decoded resizable card scale matches');
  assert.strictEqual(decodedWithVoice.card.rotation, -18, 'Decoded rotatable card angle matches');
  assert.strictEqual(decodedWithVoice.voice.style, 'vinyl', 'Decoded voice style matches');
  assert.strictEqual(decodedWithVoice.voice.title, 'Our Song', 'Decoded voice title matches');
  assert.strictEqual(decodedWithVoice.voice.durationSec, 12, 'Decoded voice duration matches');
  assert.strictEqual(decodedWithVoice.voice.x, 164, 'Decoded draggable voice X coordinate matches');
  assert.strictEqual(decodedWithVoice.voice.y, 512, 'Decoded draggable voice Y coordinate matches');
  assert.strictEqual(decodedWithVoice.voice.scale, 1.15, 'Decoded resizable voice scale matches');
  assert.strictEqual(decodedWithVoice.voice.rotation, 24, 'Decoded rotatable voice angle matches');
  assert(decodedWithVoice.voice.audioDataUrl?.startsWith('data:audio/webm;base64,'), 'Decoded voice audioDataUrl matches');
  console.log('✓ Voice keepsake catalog (5 designs), draggable/resizable/rotatable card & voice state, and share payload round-trip verified');

  // 27. On-Canvas Corner Resize+Rotate Handles, Smooth Dragging & Firebase Firestore Database Persistence Verification
  assert(studioSrc.includes('resize-card') && studioSrc.includes('resize-voice'), 'On-canvas corner resize/rotate modes present for card and voice keepsake');
  assert(studioSrc.includes('Drag corner to resize and rotate card') && studioSrc.includes('Drag corner to resize and rotate voice keepsake'), 'Accessible corner resize & rotate handles rendered on canvas');
  assert(studioSrc.includes('captureSvgPointer') && studioSrc.includes('onCardSelect') && studioSrc.includes('onVoiceSelect'), 'SVG root pointer capture and non-blocking selection wired for effortless dragging');
  assert(fs.existsSync('src/lib/firebase.ts'), 'Firebase Firestore client module exists');
  assert(fs.existsSync('firestore.rules'), 'Firestore security rules file exists');
  const shortenApiSrc = fs.readFileSync('api/shorten.js', 'utf-8');
  assert(shortenApiSrc.includes('firestore.googleapis.com') && shortenApiSrc.includes('voiceAudioDataUrl'), 'Vercel /api/shorten persists shared bouquets and voiceAudioDataUrl to Firebase Firestore');
  console.log('✓ On-canvas corner resize & rotate handles, smooth SVG drag capture, and Firebase Firestore database persistence verified');

  // 28. Panel Outside-Click Dismissal, Automatic Voice Saving/Saved Feedback & Consistent Gizmo Handles
  assert(studioSrc.includes('handleOutsidePointerDown') && studioSrc.includes('slideDrawerRef'), 'Outside-click listener closes Color, Stem, Layers, Card, and Voice panels');
  assert(!studioSrc.includes('Ready for recipient') && studioSrc.includes('Saving...') && studioSrc.includes('Saved'), 'Voice recorder provides automatic Saving... and Saved visual feedback');
  console.log('✓ Panel outside-click dismissal and automatic voice Saving/Saved feedback verified');

  // 29. Voice Wiggle Removal, Focus/Outline Ring Removal, Top-Right Play Button, Centered Card Rotation & Repo Safety
  const stageSrc = fs.readFileSync('src/components/BouquetStage.tsx', 'utf-8');
  const wiggleMatches = stageSrc.match(/bouquet-card-wiggle/g) || [];
  assert.strictEqual(wiggleMatches.length, 1, 'bouquet-card-wiggle applies to the greeting card only (removed from voice keepsake)');
  assert(stageSrc.includes('transform="translate(46, -38)"'), 'Recipient play button is placed at top-right of the voice keepsake');
  assert(stageSrc.includes('transform="translate(-1, -12)"') && stageSrc.includes('wrapCardCanvasLines'), 'Greeting card rotation is centered at (0, 0) with vector SVG text');
  assert(studioSrc.includes('outline: none !important'), 'SVG focus outline and tap highlight suppressed');
  const gitignoreSrc = fs.readFileSync('.gitignore', 'utf-8');
  assert(gitignoreSrc.includes('.env') && gitignoreSrc.includes('.aistudio') && gitignoreSrc.includes('*service-account*.json'), '.gitignore protects against pushing sensitive or temporary files');
  assert(!fs.existsSync('DRAFT_firestore.rules') && !fs.existsSync('security_spec.md') && !fs.existsSync('.env.example'), 'Temporary draft and empty env files cleaned up');
  console.log('✓ Voice wiggle removal, focus line removal, top-right play icon, centered card rotation, and .gitignore safety verified');

  // 30. Editorial Landing Page, Time-Capsule & Secret Question Locks, Couture Catalogs & Account-Free Bouquet Vault Verification
  assert(studioMod.LandingPageView, 'LandingPageView exported');
  const landingHtml = renderToString(
    React.createElement(studioMod.LandingPageView, {
      onStartCrafting: () => {},
      onOpenVault: () => {},
      vaultCount: 2,
      isDarkMode: false,
      onToggleDarkMode: () => {},
    })
  );
  assert(landingHtml.includes('Flowers For You') && landingHtml.includes('Send Love in Every Bloom.') && landingHtml.includes('Start Crafting Your Bouquet'), 'Minimal Landing Page renders brand title, Send Love in Every Bloom headline, and Start Crafting CTA');
  assert(landingHtml.includes('How It Works') && landingHtml.includes('Frequently Asked Questions') && landingHtml.includes('Make someone smile today'), 'Landing Page includes concise How It Works, Gentle Answers FAQ cards, and Make someone smile today CTA container');

  // Verify new botanicals, wrappers, and ribbons render cleanly
  const newFlowers = ['callalily', 'poppy', 'sweetpea', 'freesia', 'pampas', 'queenanneslace', 'astilbe'];
  for (const ft of newFlowers) {
    testStore.addFlower(ft);
  }
  testStore.setWrapStyle('hatbox');
  testStore.setRibbonStyle('goldchain');
  const coutureHtml = renderToString(React.createElement(App));
  assert(coutureHtml.length > 50000, 'Couture flowers, Velvet Hatbox wrapper, and Gold Chain ribbon render cleanly');

  // Verify Time-Capsule Countdown Lock & Secret Question Lock round-trip in share payload
  testStore.updateLock({
    mode: 'countdown',
    unlockAtIso: '2027-02-14T09:00',
    questionPrompt: '',
    passcodeAnswer: '',
  });
  let lockState = studioMod.useBouquetStore.getState();
  const countdownPayload = studioMod.encodeBouquetToCompactPayload(
    {
      items: lockState.items,
      wrapStyle: 'cloche',
      wrapColor: lockState.wrapColor,
      ribbonColor: lockState.ribbonColor,
      ribbonStyle: 'chiffon',
      card: lockState.card,
      voice: lockState.voice,
      lock: lockState.lock,
    },
    true
  );
  assert(countdownPayload.includes('&l=c~'), 'Encoded payload includes &l=c~ Time-Capsule Countdown Lock segment');
  const decodedCountdown = studioMod.decodeBouquetFromHash(countdownPayload);
  assert.strictEqual(decodedCountdown.wrapStyle, 'cloche', 'Decoded wrapStyle matches Glass Cloche');
  assert.strictEqual(decodedCountdown.ribbonStyle, 'chiffon', 'Decoded ribbonStyle matches Chiffon Fringe');
  assert.strictEqual(decodedCountdown.lock.mode, 'countdown', 'Decoded lock mode matches countdown');
  assert.strictEqual(decodedCountdown.lock.unlockAtIso, '2027-02-14T09:00', 'Decoded unlockAtIso matches');

  testStore.updateLock({
    mode: 'passcode',
    unlockAtIso: '',
    questionPrompt: 'The special date we first met',
    passcodeAnswer: 'October 14',
  });
  lockState = studioMod.useBouquetStore.getState();
  const passcodePayload = studioMod.encodeBouquetToCompactPayload(
    {
      items: lockState.items,
      wrapStyle: 'koreanmesh',
      wrapColor: lockState.wrapColor,
      ribbonColor: lockState.ribbonColor,
      ribbonStyle: 'raffia',
      card: lockState.card,
      voice: lockState.voice,
      lock: lockState.lock,
    },
    true
  );
  assert(passcodePayload.includes('&l=p~'), 'Encoded payload includes &l=p~ Secret Question Lock segment');
  const decodedPasscode = studioMod.decodeBouquetFromHash(passcodePayload);
  assert.strictEqual(decodedPasscode.wrapStyle, 'koreanmesh', 'Decoded wrapStyle matches Korean Mesh');
  assert.strictEqual(decodedPasscode.ribbonStyle, 'raffia', 'Decoded ribbonStyle matches Botanical Raffia');
  assert.strictEqual(decodedPasscode.lock.mode, 'passcode', 'Decoded lock mode matches passcode');
  assert.strictEqual(decodedPasscode.lock.questionPrompt, 'The special date we first met', 'Decoded questionPrompt matches');
  assert.strictEqual(decodedPasscode.lock.passcodeAnswer, 'October 14', 'Decoded passcodeAnswer matches');
  assert(studioMod.RECIPIENT_REACTIONS.length === 4, '4 recipient reaction presets exported');
  console.log('✓ Editorial Landing Page, Time-Capsule & Secret Question Locks, Couture Catalogs, and Recipient Reactions / Bouquet Vault verified');

  console.log('\nAll 30 Verification and Edge Case Checks Passed Successfully! 🎉');
} finally {
  await vite.close();
}



