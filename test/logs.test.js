// -----------------------------------------------------------------------------
// What the integration writes to `docker logs`: at info, only the lifecycle
// (the start, the API lost and back), never one line per reading; a failure
// that repeats at every cycle is logged once, plus one line when it is over.
// The key never appears.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  captureLogs,
  create,
  createFetch,
  createWorld,
  cycle,
  invalidKey,
} from './helpers/world.js';

const strip = (line) => line.text.replace(/^\[[^\]]+\] /, '');

test('the start is one info line', async (t) => {
  const lines = captureLogs(t, 'info');
  const world = await createWorld();
  t.after(() => world.app.stop());
  assert.deepEqual(lines.map(strip), [
    '[INFO] [nps] Started: 2 park(s) chosen, 0 added, alerts read every 60 min with DEMO_KEY',
  ]);
});

test('a normal reading cycle writes nothing at info, one line at debug', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  await create(world, 'yose');
  const lines = captureLogs(t, 'info');
  for (let i = 0; i < 5; i += 1) {
    await cycle(world);
  }
  assert.deepEqual(lines, []);
  const debug = captureLogs(t, 'debug');
  await cycle(world);
  // The sixth hour also reads the events again.
  assert.deepEqual(debug.map(strip), [
    '[DEBUG] [nps] 6 alert(s) read for 2 park(s)',
    '[DEBUG] [nps] 25 event(s) read',
  ]);
});

test('the API down at every cycle: one warning, then one line at recovery', async (t) => {
  const network = createFetch();
  const world = await createWorld({ network });
  t.after(() => world.app.stop());
  await create(world, 'yose');
  const lines = captureLogs(t, 'info');
  network.routes.alerts = new TypeError('fetch failed');
  for (let i = 0; i < 4; i += 1) {
    await cycle(world);
  }
  delete network.routes.alerts;
  await cycle(world);
  assert.deepEqual(lines.map(strip), [
    '[WARN] [nps] NPS API: alerts unavailable: developer.nps.gov: fetch failed',
    '[INFO] [nps] NPS API: alerts available again',
  ]);
});

test('an invalid key is said once, without the key', async (t) => {
  const lines = captureLogs(t, 'debug');
  const network = createFetch({ alerts: invalidKey, events: invalidKey, parks: invalidKey });
  const world = await createWorld({
    config: { parks: ['yose'], other_parks: 'stli', api_key: 'SECRET-KEY-123' },
    network,
  });
  t.after(() => world.app.stop());
  await cycle(world);
  await cycle(world);
  const text = lines.map(strip).join('\n');
  assert.doesNotMatch(text, /SECRET-KEY-123/);
  assert.equal(
    lines.filter((line) => /API_KEY_INVALID/.test(line.text) && line.level === 'warn').length,
    1,
  );
});
