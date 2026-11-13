import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RomanticMusicBox,
  type MusicBoxAudioContext,
  type MusicBoxGainNode,
  type MusicBoxOscillatorNode,
} from './shareAndExport';

function createMockAudioEnv(initialHidden = false, initialMobile = false) {
  let hidden = initialHidden;
  let userGesture = true;
  let mobile = initialMobile;
  let nextTimerId = 1;
  const activeTimers = new Map<number, () => void>();
  const docListeners = new Map<string, Set<() => void>>();
  const winListeners = new Map<string, Set<() => void>>();

  let createdContexts: Array<{
    ctx: MusicBoxAudioContext;
    suspendCalls: number;
    resumeCalls: number;
    closeCalls: number;
    oscillatorStarts: number;
    gainDisconnects: number;
    setState: (next: AudioContextState | 'interrupted') => void;
  }> = [];

  const createContext = () => {
    let state: AudioContextState | 'interrupted' = 'running';
    const stateListeners = new Set<() => void>();
    const tracker = {
      suspendCalls: 0,
      resumeCalls: 0,
      closeCalls: 0,
      oscillatorStarts: 0,
      gainDisconnects: 0,
      setState(next: AudioContextState | 'interrupted') {
        state = next;
        for (const fn of stateListeners) fn();
      },
      ctx: null as unknown as MusicBoxAudioContext,
    };

    const ctx: MusicBoxAudioContext = {
      get state() {
        return state;
      },
      currentTime: 10,
      destination: { kind: 'destination' },
      createGain(): MusicBoxGainNode {
        return {
          gain: {
            value: 1,
            cancelScheduledValues() {},
            setValueAtTime() {},
            linearRampToValueAtTime() {},
            exponentialRampToValueAtTime() {},
          },
          connect() {},
          disconnect() {
            tracker.gainDisconnects += 1;
          },
        };
      },
      createOscillator(): MusicBoxOscillatorNode {
        return {
          type: 'sine',
          frequency: { setValueAtTime() {} },
          connect() {},
          start() {
            tracker.oscillatorStarts += 1;
          },
          stop() {},
        };
      },
      async suspend() {
        tracker.suspendCalls += 1;
        state = 'suspended';
      },
      async resume() {
        tracker.resumeCalls += 1;
        state = 'running';
      },
      async close() {
        tracker.closeCalls += 1;
        state = 'closed';
      },
      addEventListener(type, listener) {
        if (type === 'statechange') stateListeners.add(listener);
      },
      removeEventListener(type, listener) {
        if (type === 'statechange') stateListeners.delete(listener);
      },
    };
    tracker.ctx = ctx;
    createdContexts.push(tracker);
    return ctx;
  };

  const emitDoc = (event: string) => {
    for (const fn of docListeners.get(event) ?? []) fn();
  };

  const emitWin = (event: string) => {
    for (const fn of winListeners.get(event) ?? []) fn();
  };

  const tickIntervals = () => {
    for (const fn of Array.from(activeTimers.values())) fn();
  };

  const music = new RomanticMusicBox({
    createAudioContext: createContext,
    isHidden: () => hidden,
    hasUserGesture: () => userGesture,
    isMobileOrTouch: () => mobile,
    setIntervalFn: (cb) => {
      const id = nextTimerId++;
      activeTimers.set(id, cb);
      return id;
    },
    clearIntervalFn: (id) => {
      activeTimers.delete(id);
    },
    addDocumentListener: (event, listener) => {
      if (!docListeners.has(event)) docListeners.set(event, new Set());
      docListeners.get(event)!.add(listener);
    },
    removeDocumentListener: (event, listener) => {
      docListeners.get(event)?.delete(listener);
    },
    addWindowListener: (event, listener) => {
      if (!winListeners.has(event)) winListeners.set(event, new Set());
      winListeners.get(event)!.add(listener);
    },
    removeWindowListener: (event, listener) => {
      winListeners.get(event)?.delete(listener);
    },
  });

  return {
    music,
    setHidden: (val: boolean) => {
      hidden = val;
    },
    setUserGesture: (val: boolean) => {
      userGesture = val;
    },
    setMobile: (val: boolean) => {
      mobile = val;
    },
    emitDoc,
    emitWin,
    tickIntervals,
    get activeTimerCount() {
      return activeTimers.size;
    },
    get contexts() {
      return createdContexts;
    },
  };
}

test('RomanticMusicBox suspends AudioContext, clears interval, and disconnects master gain on visibilitychange hidden / pagehide / freeze', async () => {
  const harness = createMockAudioEnv(false, false);
  try {
    harness.music.start();
    assert.equal(harness.music.getIsPlaying(), true);
    assert.equal(harness.activeTimerCount, 1);
    assert.equal(harness.contexts.length, 1);
    const tracker = harness.contexts[0];
    assert.equal(tracker.ctx.state, 'running');
    assert.equal(tracker.oscillatorStarts, 2); // primary sine + sub triangle

    // Switching tab or locking screen sets document.hidden = true + visibilitychange
    harness.setHidden(true);
    harness.emitDoc('visibilitychange');

    assert.equal(harness.activeTimerCount, 0, 'interval timer must be cleared when hidden');
    assert.equal(tracker.suspendCalls, 1, 'AudioContext must be suspended when hidden');
    assert.equal(tracker.ctx.state, 'suspended');
    assert.equal(tracker.gainDisconnects, 1, 'masterGain must disconnect to silence active tails');
    assert.equal(harness.music.isPausedInBackground(), true);
    assert.equal(harness.music.getIsPlaying(), true, 'user preference remains enabled for foreground return');

    // Ticking or calling resumeIfBlocked while hidden must not schedule oscillators
    const oscBefore = tracker.oscillatorStarts;
    harness.music.resumeIfBlocked();
    harness.tickIntervals();
    assert.equal(tracker.oscillatorStarts, oscBefore);

    // Returning to foreground resumes playback seamlessly
    harness.setHidden(false);
    harness.emitDoc('visibilitychange');
    await Promise.resolve();
    assert.equal(harness.activeTimerCount, 1);
    assert.equal(tracker.resumeCalls, 1);
    assert.equal(tracker.ctx.state, 'running');
    assert.ok(tracker.oscillatorStarts > oscBefore);

    // pagehide and freeze also suspend immediately
    harness.emitWin('pagehide');
    assert.equal(harness.activeTimerCount, 0);
    assert.equal(tracker.ctx.state, 'suspended');

    harness.emitWin('pageshow');
    await Promise.resolve();
    assert.equal(tracker.ctx.state, 'running');

    harness.emitDoc('freeze');
    assert.equal(harness.activeTimerCount, 0);
    assert.equal(tracker.ctx.state, 'suspended');
  } finally {
    harness.music.dispose();
  }
});

test('RomanticMusicBox does NOT resume after user explicitly muted via stop() when returning from background', async () => {
  const harness = createMockAudioEnv(false, false);
  const observedStates: boolean[] = [];
  const unsubscribe = harness.music.subscribe((playing) => observedStates.push(playing));

  try {
    harness.music.start();
    const tracker = harness.contexts[0];
    assert.equal(harness.music.getIsPlaying(), true);

    harness.music.stop();
    assert.equal(harness.music.getIsPlaying(), false);
    assert.equal(harness.activeTimerCount, 0);
    assert.equal(tracker.ctx.state, 'suspended');

    // Tab switch away and back should keep music muted
    harness.setHidden(true);
    harness.emitDoc('visibilitychange');
    harness.setHidden(false);
    harness.emitDoc('visibilitychange');
    harness.emitWin('pageshow');
    harness.emitWin('focus');
    await Promise.resolve();

    assert.equal(harness.music.getIsPlaying(), false);
    assert.equal(harness.activeTimerCount, 0);
    assert.equal(tracker.ctx.state, 'suspended');
    assert.deepEqual(observedStates, [true, false]);
  } finally {
    unsubscribe();
    harness.music.dispose();
  }
});

test('RomanticMusicBox pauses on mobile blur (phone home / in-app WebView) but ignores desktop blur while tab stays visible', async () => {
  const desktopHarness = createMockAudioEnv(false, false);
  try {
    desktopHarness.music.start();
    assert.equal(desktopHarness.contexts[0].ctx.state, 'running');
    desktopHarness.emitWin('blur');
    assert.equal(desktopHarness.contexts[0].ctx.state, 'running');
    assert.equal(desktopHarness.activeTimerCount, 1);
  } finally {
    desktopHarness.music.dispose();
  }

  const mobileHarness = createMockAudioEnv(false, true);
  try {
    mobileHarness.music.start();
    const tracker = mobileHarness.contexts[0];
    assert.equal(tracker.ctx.state, 'running');

    // Phone lock / Home button / switching app fires blur on mobile WebViews
    mobileHarness.emitWin('blur');
    assert.equal(tracker.ctx.state, 'suspended');
    assert.equal(mobileHarness.activeTimerCount, 0);
    assert.equal(mobileHarness.music.isPausedInBackground(), true);

    // Focusing back when tab is visible restores playback
    mobileHarness.emitWin('focus');
    await Promise.resolve();
    assert.equal(tracker.ctx.state, 'running');
    assert.equal(mobileHarness.activeTimerCount, 1);
  } finally {
    mobileHarness.music.dispose();
  }
});

test('RomanticMusicBox never creates AudioContext or loops intervals if started while tab is hidden or closing', async () => {
  const harness = createMockAudioEnv(true, true);
  try {
    harness.music.start();
    assert.equal(harness.contexts.length, 0, 'no AudioContext created in background tab');
    assert.equal(harness.activeTimerCount, 0, 'no interval started in background tab');

    // Switching to the tab later starts cleanly
    harness.setHidden(false);
    harness.emitDoc('visibilitychange');
    await Promise.resolve();
    assert.equal(harness.contexts.length, 1);
    assert.equal(harness.contexts[0].ctx.state, 'running');
    assert.equal(harness.activeTimerCount, 1);

    // beforeunload stops music and closes AudioContext cleanly
    harness.emitWin('beforeunload');
    assert.equal(harness.contexts[0].closeCalls, 1);
    assert.equal(harness.activeTimerCount, 0);
    assert.equal(harness.music.getIsPlaying(), false);
  } finally {
    harness.music.dispose();
  }
});
