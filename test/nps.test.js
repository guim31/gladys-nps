// -----------------------------------------------------------------------------
// The NPS client and the park time, on the real answers of the API.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig } from '../src/config.js';
import { categoryOf, parseAlert, readAlerts } from '../src/nps.js';
import { eventOccurrences, nextEvent, parseClock, zonedTime } from '../src/time.js';
import { FIXTURE_TIME, fixtureJson } from './helpers/world.js';

test('the four NPS categories, an unknown one counts as information', () => {
  assert.equal(categoryOf('Park Closure'), 'closure');
  assert.equal(categoryOf('danger'), 'danger');
  assert.equal(categoryOf('Caution'), 'caution');
  assert.equal(categoryOf('Information'), 'information');
  assert.equal(categoryOf('Something else'), 'information');
});

test('every captured alert parses', () => {
  const alerts = fixtureJson('alerts.json').data.map(parseAlert);
  assert.equal(alerts.length, 16);
  assert.ok(alerts.every((alert) => alert && alert.id && alert.title));
  assert.equal(parseAlert({ parkCode: 'yose' }), null);
});

test('the alerts are read page after page when the API says there are more', async () => {
  const urls = [];
  const fetch = async (url) => {
    urls.push(url);
    const start = Number(new URL(url).searchParams.get('start'));
    const data = start === 0 ? [{ id: 'a', parkCode: 'yose', title: 'A', category: 'Danger' }] : [];
    const total = start === 0 ? 2 : 2;
    const page = start === 0 ? data : [{ id: 'b', parkCode: 'yose', title: 'B' }];
    return new Response(JSON.stringify({ total: String(total), data: page }));
  };
  const alerts = await readAlerts(fetch, 'KEY', ['yose'], FIXTURE_TIME);
  assert.deepEqual(
    alerts.map((alert) => alert.id),
    ['a', 'b'],
  );
  assert.equal(urls.length, 2);
});

test('NPS hours, AM and PM', () => {
  assert.deepEqual(parseClock('02:00 PM'), { hour: 14, minute: 0 });
  assert.deepEqual(parseClock('12:30 AM'), { hour: 0, minute: 30 });
  assert.deepEqual(parseClock('12:15 PM'), { hour: 12, minute: 15 });
  assert.equal(parseClock(''), null);
});

test('a local time is placed in time, daylight saving included', () => {
  // 1 July: Pacific daylight time (UTC-7); 12 November: standard time (UTC-8).
  assert.equal(zonedTime('2026-07-01', 9, 0, 'America/Los_Angeles'), Date.UTC(2026, 6, 1, 16, 0));
  assert.equal(zonedTime('2026-11-12', 9, 0, 'America/Los_Angeles'), Date.UTC(2026, 10, 12, 17, 0));
  // Arizona has no daylight saving.
  assert.equal(zonedTime('2026-07-01', 9, 0, 'America/Phoenix'), Date.UTC(2026, 6, 1, 16, 0));
});

test('cancelled dates are skipped, an all-day event lasts its whole day', () => {
  const occurrences = eventOccurrences(
    {
      dates: ['2026-11-12', '2026-11-13'],
      cancelleddatelist: ['2026-11-12'],
      isallday: 'true',
      times: [],
    },
    'America/Denver',
  );
  assert.deepEqual(
    occurrences.map((o) => o.date),
    ['2026-11-13'],
  );
  const event = {
    title: 'Fair',
    occurrences: eventOccurrences({ dates: ['2026-11-12'], isallday: 'true' }, 'America/Denver'),
  };
  // 23:00 in Denver on the 12th: the all-day event is still on.
  assert.equal(nextEvent([event], Date.UTC(2026, 10, 13, 6, 0), 'America/Denver')?.event, event);
  assert.equal(nextEvent([event], Date.UTC(2026, 10, 13, 8, 0), 'America/Denver'), null);
});

test('the configuration: DEMO_KEY when empty, codes typed in any case, invalid ones apart', () => {
  const config = normalizeConfig({ parks: ['yose', 'nope'], other_parks: 'STLI; yose, 12' });
  assert.equal(config.apiKey, 'DEMO_KEY');
  assert.equal(config.demoKey, true);
  assert.deepEqual(config.parks, ['yose', 'stli']);
  assert.deepEqual(config.invalidParks, ['12']);
  assert.equal(normalizeConfig({ api_key: ' abc ' }).apiKey, 'abc');
  assert.equal(normalizeConfig({ refresh_interval: '5' }).refreshMinutes, 60);
});
