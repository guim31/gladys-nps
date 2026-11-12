// -----------------------------------------------------------------------------
// A complete test world: the SDK's fake Gladys, a fake `fetch` serving the
// real answers of the NPS API (captured on 2026-11-12 at 08:06 UTC with
// DEMO_KEY, see test/fixtures/README.md), a manual clock, a memory store, and
// the integration wired on top through registerHandlers. Nothing touches the
// network.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../../src/app.js';

process.env.LOG_LEVEL ??= 'silent';

export const fixtureJson = (name) =>
  JSON.parse(readFileSync(new URL(`../fixtures/api/${name}`, import.meta.url), 'utf8'));

// 2026-11-12 08:06 UTC, the time of the capture (00:06 in Yosemite).
export const FIXTURE_TIME = Date.UTC(2026, 10, 12, 8, 6, 0);

// The five parks of the capture.
export const FIXTURE_PARKS = ['yose', 'yell', 'grca', 'acad', 'zion'];

const ALERTS = fixtureJson('alerts.json');
const EVENTS = fixtureJson('events.json');
const PARKS = fixtureJson('parks-other.json');

const codesOf = (url) => (new URL(url).searchParams.get('parkCode') ?? '').split(',');

/** The answer of the API for a request, from the captured documents (filtered by parkCode). */
function serve(url, documents) {
  const { pathname, searchParams } = new URL(url);
  const codes = codesOf(url);
  if (pathname.endsWith('/alerts')) {
    const data = documents.alerts.data.filter((a) => codes.includes(a.parkCode));
    return { total: String(data.length), limit: '500', start: '0', data };
  }
  if (pathname.endsWith('/events')) {
    const all = documents.events.data.filter((e) => codes.includes(e.sitecode));
    const size = Number(searchParams.get('pageSize'));
    const page = Number(searchParams.get('pageNumber'));
    return {
      pagesize: String(size),
      pagenumber: String(page),
      total: String(all.length),
      errors: [],
      data: all.slice((page - 1) * size, page * size),
    };
  }
  if (pathname.endsWith('/parks')) {
    const data = documents.parks.data.filter((p) => codes.includes(p.parkCode));
    return { total: String(data.length), limit: '50', start: '0', data };
  }
  return undefined;
}

const respond = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const invalidKey = () => respond(403, fixtureJson('error-api-key-invalid.json'));
// The real 429 of 2026-11-12 asked to come back 15 hours later.
export const overRateLimit = () => {
  const response = respond(429, fixtureJson('error-over-rate-limit.json'));
  response.headers.set('retry-after', '56419');
  return response;
};

/**
 * A fake `fetch`. `routes.alerts|events|parks` override an endpoint: a status
 * number, a Response, an Error (network failure) or a function of the URL
 * returning one of them or a JSON value. `documents` are the served data (a
 * test may change them). Every call is recorded in `calls`.
 */
export function createFetch(routes = {}) {
  const documents = {
    alerts: structuredClone(ALERTS),
    events: structuredClone(EVENTS),
    parks: structuredClone(PARKS),
  };
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url, headers: init.headers ?? {} });
    const endpoint = new URL(url).pathname.split('/').pop();
    let route = routes[endpoint];
    if (typeof route === 'function') {
      route = await route(url, init);
    }
    if (route instanceof Error) {
      throw route;
    }
    if (route instanceof Response) {
      return route;
    }
    if (typeof route === 'number') {
      return new Response('error', { status: route });
    }
    const body = route ?? serve(url, documents);
    return body === undefined ? new Response('not found', { status: 404 }) : respond(200, body);
  };
  return { fetch, calls, routes, documents };
}

/** A manual clock. */
export function createClock(start = FIXTURE_TIME) {
  const clock = {
    time: start,
    now: () => clock.time,
    advance(ms) {
      clock.time += ms;
    },
  };
  return clock;
}

/** A store in memory (src/store.js writes under /data). */
export function createStore(initial = {}) {
  const store = {
    data: structuredClone(initial),
    async load() {
      return structuredClone(store.data);
    },
    save(data) {
      store.data = structuredClone(data);
      return Promise.resolve();
    },
    flush: () => Promise.resolve(),
  };
  return store;
}

/**
 * @param {object} [options]
 * @param {object} [options.config] raw integration config
 * @param {object} [options.network] from createFetch
 * @param {Array} [options.devices] devices already created in Gladys
 * @param {boolean} [options.connect]
 */
export async function createWorld({
  config = { parks: ['yose', 'grca'] },
  network = createFetch(),
  devices = [],
  connect = true,
  clock = createClock(),
  store = createStore(),
} = {}) {
  const gladys = createFakeGladys({ config, devices });
  const app = registerHandlers(gladys, {
    fetch: network.fetch,
    timers: false,
    now: clock.now,
    store,
  });
  const world = { gladys, fake: gladys.fake, app, service: app.service, network, clock, store };
  if (connect) {
    await gladys.connect();
    await app.ready;
    await app.service.loading;
  }
  return world;
}

/** Run a configuration action; resolves with its message (multi-language). */
export async function action(world, key, fields = {}) {
  const ack = await world.fake.action(key, fields);
  if (!ack.success) {
    throw new Error(`${key} failed: ${ack.error}`);
  }
  return ack.data.message;
}

/** The device published for a park code, from the last discovery list. */
export const discovered = (world, code) =>
  world.fake.discoveredDevices.find((d) => d.external_id.endsWith(`:park:${code}`));

/** Create a discovered device in Gladys, as the user would. */
export async function create(world, code) {
  const device = discovered(world, code);
  if (!device) {
    throw new Error(`${code} is not in the discovered devices`);
  }
  await world.fake.deviceCreated(device);
  return device;
}

/** External id of one feature of a device. */
export const featureId = (device, key) =>
  device.features.find((feature) => feature.external_id.endsWith(`:${key}`))?.external_id;

/** One refresh cycle, `minutes` later. */
export async function cycle(world, minutes = 60) {
  world.clock.advance(minutes * 60 * 1000);
  await world.service.refresh();
}

/** Captures what the integration logs, at a level. */
export function captureLogs(t, level = 'info') {
  const previous = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = level;
  const lines = [];
  const record = (...args) => {
    const text = args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(' ');
    const match = /^\[[^\]]+\] \[(\w+)\]/.exec(text);
    lines.push({ level: match ? match[1].toLowerCase() : 'raw', text });
  };
  t.mock.method(console, 'log', record);
  t.mock.method(console, 'error', record);
  t.after(() => {
    process.env.LOG_LEVEL = previous;
  });
  return lines;
}
