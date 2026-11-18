import test from 'node:test';
import assert from 'node:assert/strict';
import { ENVIRONMENT_CATALOG } from '../types/bouquet';
import { getEnvironmentPageBackdrop } from './environmentBackdrop';

test('every CanvasEnvironment has distinct blended backdrop and visible canvas square framing in light and dark modes', () => {
  for (const env of ENVIRONMENT_CATALOG) {
    const light = getEnvironmentPageBackdrop(env.id, false);
    const dark = getEnvironmentPageBackdrop(env.id, true);

    assert.ok(light.pageBackground.includes('gradient('), `${env.id} light backdrop uses smooth gradient`);
    assert.ok(dark.pageBackground.includes('gradient('), `${env.id} dark backdrop uses smooth gradient`);
    assert.ok(light.canvasBorderColor.length > 0, `${env.id} light canvas square border is visible`);
    assert.ok(dark.canvasBorderColor.length > 0, `${env.id} dark canvas square border is visible`);
    assert.ok(light.canvasShadow.length > 0, `${env.id} light canvas square shadow is defined`);
    assert.ok(dark.canvasShadow.length > 0, `${env.id} dark canvas square shadow is defined`);
    assert.equal(dark.isDarkEnvironment, true, `${env.id} in dark mode is marked dark`);
  }
});

test('nocturnal environments stay harmonized dark even when UI is in light mode', () => {
  for (const darkId of ['starlit', 'velvetSalon', 'midnightNoel'] as const) {
    const backdrop = getEnvironmentPageBackdrop(darkId, false);
    assert.equal(backdrop.isDarkEnvironment, true, `${darkId} is inherently dark`);
  }
  assert.equal(getEnvironmentPageBackdrop('studio', false).isDarkEnvironment, false);
  assert.equal(getEnvironmentPageBackdrop('blushSilk', false).isDarkEnvironment, false);
  assert.equal(getEnvironmentPageBackdrop('meadow', false).isDarkEnvironment, false);
});

test('non-studio environments produce unique page backdrops distinct from Warm Studio', () => {
  const studioLight = getEnvironmentPageBackdrop('studio', false).pageBackground;
  for (const env of ENVIRONMENT_CATALOG) {
    if (env.id === 'studio') continue;
    const bg = getEnvironmentPageBackdrop(env.id, false).pageBackground;
    assert.notEqual(bg, studioLight, `${env.id} blends to its own palette rather than default studio`);
  }
});
