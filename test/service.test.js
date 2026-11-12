// -----------------------------------------------------------------------------
// The integration end to end against the SDK's fake Gladys and the real
// answers of the NPS API: discovery, states, the trigger, the connection
// status on a bad key or a reached quota, the request budget, the own timer.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../src/app.js';
import { STATUS } from '../src/messages.js';
import {
  FIXTURE_PARKS,
  FIXTURE_TIME,
  action,
  create,
  createClock,
  createFetch,
  createStore,
  createWorld,
  cycle,
  discovered,
  featureId,
  invalidKey,
  overRateLimit,
} from './helpers/world.js';

const state = (world, device, key) => world.fake.lastState(featureId(device, key));

test('each chosen park is offered in the Discover tab, polled by the container', async (t) => {
  const world = await createWorld({ config: { parks: FIXTURE_PARKS } });
  t.after(() => world.app.stop());
  const devices = world.fake.discoveredDevices;
  assert.deepEqual(
    devices.map((d) => d.name),
    [
      'Acadia National Park',
      'Grand Canyon National Park',
      'Yellowstone National Park',
      'Yosemite National Park',
      'Zion National Park',
    ],
  );
  for (const device of devices) {
    assert.equal(device.should_poll, false);
    assert.equal(device.poll_frequency, undefined);
  }
  assert.match(discovered(world, 'yose').external_id, /:park:yose$/);
});

test('a park added to Gladys gets its alert counts, level and most serious alert', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const yose = await create(world, 'yose');
  const grca = await create(world, 'grca');
  assert.equal(state(world, yose, 'closure_alerts'), 1);
  assert.equal(state(world, yose, 'danger_alerts'), 0);
  assert.equal(state(world, yose, 'information_alerts'), 1);
  assert.equal(state(world, yose, 'closure'), 1);
  assert.equal(state(world, yose, 'alert_level'), 3);
  assert.match(state(world, yose, 'top_alert'), /^Fermeture : Tioga Road and Glacier Point Road/);
  assert.equal(state(world, grca, 'closure_alerts'), 1);
  assert.equal(state(world, grca, 'danger_alerts'), 1);
  assert.equal(state(world, grca, 'caution_alerts'), 2);
  assert.equal(state(world, grca, 'top_alert'), 'Fermeture : INNER CANYON TRAIL CLOSURES');
});

test('the next event is given at the park time, in the configured language', async (t) => {
  const world = await createWorld({ config: { parks: ['yose', 'acad'], language: 'en' } });
  t.after(() => world.app.stop());
  const yose = await create(world, 'yose');
  const acad = await create(world, 'acad');
  // 00:06 in Yosemite: the first event of the day is the 09:00 photography walk.
  assert.equal(
    state(world, yose, 'next_event'),
    'Thu, Nov 12, 09:00 AM · The Ansel Adams Gallery Photography Walk (Yosemite Valley)',
  );
  assert.equal(state(world, acad, 'next_event'), 'No event planned');
  // At 09:10 in Yosemite, the next one is the nature walk of 09:30.
  world.clock.time = Date.UTC(2026, 10, 12, 17, 10);
  await world.service.refresh();
  assert.match(state(world, yose, 'next_event'), /^Thu, Nov 12, 09:30 AM · Nature Walk/);
});

test('a park without alert: zero everywhere, "no alert", closure off', async (t) => {
  const network = createFetch();
  network.documents.alerts.data = network.documents.alerts.data.filter(
    (a) => a.parkCode !== 'zion',
  );
  const world = await createWorld({ config: { parks: ['zion'] }, network });
  t.after(() => world.app.stop());
  const zion = await create(world, 'zion');
  for (const key of ['closure_alerts', 'danger_alerts', 'caution_alerts', 'information_alerts']) {
    assert.equal(state(world, zion, key), 0, key);
  }
  assert.equal(state(world, zion, 'closure'), 0);
  assert.equal(state(world, zion, 'alert_level'), 0);
  assert.equal(state(world, zion, 'top_alert'), 'Aucune alerte');
});

test('a new alert of a park added fires new_alert once, never at start nor after a restart', async (t) => {
  const store = createStore();
  const network = createFetch();
  const world = await createWorld({ network, store });
  t.after(() => world.app.stop());
  const yose = await create(world, 'yose');
  await cycle(world);
  assert.deepEqual(world.fake.sceneEvents, []);
  network.documents.alerts.data.unshift({
    id: 'NEW-1',
    url: 'https://www.nps.gov/yose/planyourvisit/conditions.htm',
    title: 'Hetch Hetchy Road closed',
    parkCode: 'yose',
    description: 'Snow.',
    category: 'Danger',
    relatedRoadEvents: [],
    lastIndexedDate: '2026-11-12 00:00:00.0',
  });
  await cycle(world);
  await cycle(world);
  assert.equal(world.fake.sceneEvents.length, 1);
  const [event] = world.fake.sceneEvents;
  assert.equal(event.key ?? event.type, 'new_alert');
  const data = event.data ?? event;
  assert.equal(data.park, yose.external_id);
  assert.equal(data.category, 'danger');
  assert.equal(data.text, 'Danger : Hetch Hetchy Road closed');
  assert.equal(state(world, yose, 'alert_level'), 3);
  assert.equal(state(world, yose, 'danger_alerts'), 1);
  assert.match(state(world, yose, 'top_alert'), /^Fermeture/);

  // A restart reads the same alerts: nothing new.
  await world.app.stop();
  const again = await createWorld({ network, store, devices: [world.fake.devices[0]] });
  t.after(() => again.app.stop());
  await cycle(again);
  assert.deepEqual(again.fake.sceneEvents, []);
});

test('an invalid key: clear status on the integration page, back when fixed', async (t) => {
  const network = createFetch({ alerts: invalidKey, parks: invalidKey, events: invalidKey });
  const world = await createWorld({ config: { parks: ['yose'], api_key: 'bad' }, network });
  t.after(() => world.app.stop());
  assert.equal(world.fake.connectionStatus.connected, false);
  assert.deepEqual(world.fake.connectionStatus.message, STATUS.keyInvalid);
  const report = await action(world, 'status');
  assert.match(report.en, /NPS API key is not valid/);
  assert.match(report.en, /API_KEY_INVALID/);
  // The device is offered all the same, without states.
  assert.ok(discovered(world, 'yose'));
  delete network.routes.alerts;
  delete network.routes.events;
  delete network.routes.parks;
  await world.fake.configUpdated({ parks: ['yose'], api_key: 'good' });
  assert.equal(world.fake.connectionStatus.connected, true);
});

test('the hourly limit reached: clear status, then no request for an hour', async (t) => {
  const network = createFetch({ alerts: overRateLimit });
  const world = await createWorld({ config: { parks: ['yose'] }, network });
  t.after(() => world.app.stop());
  assert.deepEqual(world.fake.connectionStatus.message, STATUS.rateLimit);
  const before = network.calls.length;
  await cycle(world, 30);
  assert.equal(network.calls.length, before);
  delete network.routes.alerts;
  await cycle(world, 31);
  assert.ok(network.calls.length > before);
  assert.equal(world.fake.connectionStatus.connected, true);
});

test('the key travels in a header, never in a URL; empty key means DEMO_KEY', async (t) => {
  const network = createFetch();
  const world = await createWorld({ config: { parks: ['yose'] }, network });
  t.after(() => world.app.stop());
  for (const call of network.calls) {
    assert.doesNotMatch(call.url, /api_key|DEMO_KEY/i);
    assert.equal(call.headers['x-api-key'], 'DEMO_KEY');
  }
  const report = await action(world, 'status');
  assert.match(report.fr, /DEMO_KEY est utilisée/);
});

test('request budget: one grouped alerts request per refresh, events every six hours', async (t) => {
  const network = createFetch();
  const world = await createWorld({ config: { parks: FIXTURE_PARKS }, network });
  t.after(() => world.app.stop());
  const endpoints = () => network.calls.map((call) => new URL(call.url).pathname.split('/').pop());
  // Start: alerts and events (the national parks need no /parks request).
  assert.deepEqual(endpoints(), ['alerts', 'events']);
  assert.equal(
    new URL(network.calls[0].url).searchParams.get('parkCode'),
    'acad,grca,yell,yose,zion',
  );
  network.calls.length = 0;
  for (let i = 0; i < 5; i += 1) {
    await cycle(world, 60);
  }
  assert.deepEqual(endpoints(), ['alerts', 'alerts', 'alerts', 'alerts', 'alerts']);
  await cycle(world, 60);
  assert.deepEqual(endpoints().slice(5), ['alerts', 'events']);
});

test('the core poll does not spend the quota when the last reading is recent', async (t) => {
  const network = createFetch();
  const world = await createWorld({ network });
  t.after(() => world.app.stop());
  const yose = await create(world, 'yose');
  network.calls.length = 0;
  await world.fake.poll(yose);
  assert.equal(network.calls.length, 0);
  world.clock.advance(31 * 60 * 1000);
  await world.fake.poll(yose);
  assert.equal(network.calls.length, 1);
});

test('the container refreshes on its own timer, without any poll from the core', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const clock = createClock(FIXTURE_TIME);
  const network = createFetch();
  const gladys = createFakeGladys({ config: { parks: ['yose'], refresh_interval: '30' } });
  const app = registerHandlers(gladys, {
    fetch: network.fetch,
    now: clock.now,
    store: createStore(),
  });
  t.after(() => app.stop());
  await gladys.connect();
  await app.ready;
  await app.service.loading;
  const before = network.calls.length;
  clock.advance(30 * 60 * 1000);
  t.mock.timers.tick(30 * 60 * 1000);
  await app.service.refreshing;
  assert.equal(network.calls.length, before + 1);
});

test('other NPS sites by code: named by the API, unknown and invalid codes reported', async (t) => {
  const network = createFetch();
  const world = await createWorld({
    config: { parks: ['yose'], other_parks: 'STLI, alca; nope 12' },
    network,
  });
  t.after(() => world.app.stop());
  assert.deepEqual(
    world.fake.discoveredDevices.map((d) => d.name),
    ['Yosemite National Park', 'Statue Of Liberty National Monument', 'Alcatraz Island'],
  );
  assert.equal(world.service.park('stli').zone, 'America/New_York');
  const report = await action(world, 'status');
  assert.match(report.en, /Codes unknown to the NPS: nope/);
  assert.match(report.en, /Not park codes, ignored: 12/);
});

test('the API down: states kept, status says so, back at the next refresh', async (t) => {
  const network = createFetch();
  const world = await createWorld({ network });
  t.after(() => world.app.stop());
  const yose = await create(world, 'yose');
  network.routes.alerts = new TypeError('fetch failed');
  await cycle(world);
  assert.deepEqual(world.fake.connectionStatus.message, STATUS.unreachable);
  assert.equal(state(world, yose, 'closure_alerts'), 1);
  delete network.routes.alerts;
  await cycle(world);
  assert.equal(world.fake.connectionStatus.connected, true);
});

test('a changed language republishes the texts', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const yose = await create(world, 'yose');
  await world.fake.configUpdated({ parks: ['yose', 'grca'], language: 'de' });
  assert.match(state(world, yose, 'top_alert'), /^Schließung: /);
});

test('the scene action reads the alerts of the parks picked', async (t) => {
  const world = await createWorld({ config: { parks: ['yose', 'grca'], language: 'en' } });
  t.after(() => world.app.stop());
  const yose = await create(world, 'yose');
  await create(world, 'grca');
  const all = await world.fake.sceneAction('read_alerts', {});
  assert.equal(all.success, true);
  assert.equal(all.data.outputs.count, 6);
  assert.equal(all.data.outputs.closures, 2);
  assert.equal(all.data.outputs.dangers, 1);
  assert.equal(all.data.outputs.top_category, 'closure');
  const one = await world.fake.sceneAction('read_alerts', { parks: [yose.external_id] });
  assert.match(
    one.data.outputs.text,
    /^Yosemite National Park: 2 alerts\. Closure: Tioga Road .* ; Information: /,
  );
});
