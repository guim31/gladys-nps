// -----------------------------------------------------------------------------
// The integration at runtime: the followed parks, their last alerts and
// events, the refresh timer, the devices offered in the Discover tab, the
// states of the parks added to Gladys, the connection status and the scene
// trigger.
//
// Requests: one grouped /alerts request for every park at each refresh (30,
// 60 or 120 minutes), /events every six hours and at each new day, /parks
// once for the sites typed by code. With DEMO_KEY (a few requests an hour per
// address) that stays inside the quota.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { DEFAULT_CONFIG, normalizeConfig } from './config.js';
import { PARK_TYPE, alertText, buildParkDevice, parkIds, parkStates } from './devices.js';
import { REPORTS, STATUS, TEXT, lines, render, say } from './messages.js';
import { readAlerts, readEvents, readParks } from './nps.js';
import { PARKS, STATE_ZONES } from './parks.js';
import { Store } from './store.js';
import { addDays, localDate, nextEvent, safeZone } from './time.js';

const logger = createLogger({ name: 'nps' });

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
// Unchanged states (no alert for weeks) are sent again this often, or the
// dashboard shows "no recent value" after 48 hours.
export const HEARTBEAT_MS = 12 * HOUR;
// The events are read again after this, and at every new day.
export const EVENTS_MS = 6 * HOUR;
// Days of events asked for: enough to always know the next one.
export const EVENT_DAYS = 31;
// Pause after a 429: api.data.gov counts requests over a rolling hour, and its
// Retry-After can ask for many hours (15 h seen with DEMO_KEY): the pause
// follows it, capped, so a new day or a new key is noticed in time.
export const RATE_LIMIT_PAUSE_MS = HOUR;
export const MAX_PAUSE_MS = 2 * HOUR;
// A reading younger than this is not done again for a scan or a reconnection.
export const FRESH_MS = 10 * MINUTE;

export const TRIGGERS = { NEW_ALERT: 'new_alert' };
export const WIDGET_KEY = 'alerts';

const KNOWN = new Map(PARKS.map((park) => [park.code, park]));

/** What went wrong with the API, as a status key of STATUS. */
function statusOf(err) {
  if (err.status === 429 || err.code === 'OVER_RATE_LIMIT') {
    return 'rateLimit';
  }
  if (err.status === 401 || err.status === 403 || /^API_KEY/.test(err.code ?? '')) {
    return 'keyInvalid';
  }
  return 'unreachable';
}

export class NationalParks {
  /**
   * @param {object} options
   * @param {object} options.gladys GladysIntegration (or the SDK's fake)
   * @param {typeof fetch} [options.fetch]
   * @param {() => number} [options.now]
   * @param {boolean} [options.timers] false in the tests: they call refresh()
   * @param {object} [options.store] see src/store.js
   */
  constructor({ gladys, fetch = globalThis.fetch, now = Date.now, timers = true, store }) {
    this.gladys = gladys;
    this.fetch = fetch;
    this.now = now;
    this.useTimers = timers;
    this.store = store ?? new Store();
    this.config = normalizeConfig(DEFAULT_CONFIG);
    this.parks = new Map(); // code → { code, name, zone, alerts, events, ... }
    this.seen = {}; // code → alert ids already seen (persisted)
    this.unknown = []; // codes the NPS does not know
    this.okAt = null;
    this.error = null; // { key, message } of the last failed reading
    this.statusKey = undefined;
    this.backoffUntil = 0;
    this.eventsAt = null;
    this.eventsDay = null;
    this.eventsCodes = '';
    this.namesCodes = '';
    this.discoveredSignature = null;
    this.alertsSignature = null;
    this.publishFailed = false;
    this.discoveryFailed = false;
    this.fireFailed = false;
    this.timer = null;
    this.stopped = false;
    this.refreshing = null;
    this.loading = Promise.resolve();
  }

  // --- lifecycle --------------------------------------------------------------

  async start(config) {
    this.config = config;
    const saved = await this.store.load();
    this.seen = saved.seen && typeof saved.seen === 'object' ? saved.seen : {};
    this.warnConfig();
    this.schedule();
    logger.info(
      `Started: ${config.parks.length} park(s) chosen, ${this.watched().length} added, alerts read every ${config.refreshMinutes} min${config.demoKey ? ' with DEMO_KEY' : ''}`,
    );
    // The first reading in the background: the widget and the scene action
    // wait for it.
    this.loading = this.refresh({ discover: true });
  }

  /** Gladys restarted: everything again, the states included. */
  async resync(config) {
    this.config = config;
    this.statusKey = undefined;
    this.gladys.forgetPublishedStates?.();
    await this.refresh({ discover: true, ifFresh: true });
  }

  async reconfigure(config) {
    const previous = this.config;
    this.config = config;
    if (config.language !== previous.language) {
      // The texts follow the language.
      this.gladys.forgetPublishedStates?.();
    }
    if (config.apiKey !== previous.apiKey) {
      // A new key deserves a try at once.
      this.backoffUntil = 0;
    }
    this.warnConfig();
    logger.info('Configuration saved');
    this.schedule();
    await this.refresh({ discover: true });
  }

  async stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    await this.refreshing;
    await this.store.flush();
  }

  warnConfig() {
    if (this.config.invalidParks.length > 0) {
      logger.warn(`Not park codes, ignored: ${this.config.invalidParks.join(', ')}`);
    }
  }

  schedule() {
    if (!this.useTimers || this.stopped) {
      return;
    }
    clearTimeout(this.timer);
    // A callback still running when the schedule changes must not start a
    // second chain: each chain only continues while it is the current one.
    this.generation = (this.generation ?? 0) + 1;
    const generation = this.generation;
    const tick = () => {
      this.timer = setTimeout(async () => {
        await this.refresh();
        if (!this.stopped && this.generation === generation) {
          tick();
        }
      }, this.config.refreshMinutes * MINUTE);
      this.timer.unref?.();
    };
    tick();
  }

  // --- parks and devices ------------------------------------------------------

  /** The park code of a device created in Gladys, or null. */
  static codeOf(device) {
    const param = device?.params?.find?.((p) => p.name === 'park_code')?.value;
    const match = /:park:([a-z]+)$/.exec(String(device?.external_id ?? ''));
    return param ?? match?.[1] ?? null;
  }

  /** The parks added to Gladys: `{ deviceId, code, name }[]`. */
  watched() {
    return (this.gladys.devices ?? [])
      .map((device) => ({
        deviceId: device.external_id,
        code: NationalParks.codeOf(device),
        name: device.name,
      }))
      .filter((entry) => entry.code);
  }

  /** The parks to read: the ones chosen, and the ones added to Gladys. */
  activeCodes() {
    return [...new Set([...this.config.parks, ...this.watched().map((entry) => entry.code)])];
  }

  park(code) {
    if (!this.parks.has(code)) {
      const known = KNOWN.get(code);
      this.parks.set(code, {
        code,
        name: known?.name ?? code.toUpperCase(),
        zone: known?.zone ?? 'America/New_York',
        named: Boolean(known),
        alerts: null,
        events: null,
      });
    }
    return this.parks.get(code);
  }

  isStale() {
    return this.okAt === null || this.now() - this.okAt > 3 * this.config.refreshMinutes * MINUTE;
  }

  /** Waits for the first reading (at most `ms`), for a widget or a scene action asked at start. */
  async firstReading(ms = 10000) {
    let timer;
    await Promise.race([
      this.loading,
      new Promise((resolve) => {
        timer = setTimeout(resolve, ms);
      }),
    ]);
    clearTimeout(timer);
  }

  /** The state of a park for devices.js: its alerts and its next event. */
  parkView(park) {
    return {
      code: park.code,
      zone: park.zone,
      alerts: park.alerts,
      eventsKnown: park.events !== null,
      next: park.events ? nextEvent(park.events, this.now(), park.zone) : null,
    };
  }

  // --- publication ------------------------------------------------------------

  async publishDiscovered({ force = false } = {}) {
    const language = this.config.language;
    // The parks the NPS does not know are not offered.
    const devices = this.config.parks
      .filter((code) => !this.unknown.includes(code) && this.park(code).named)
      .map((code) => buildParkDevice(this.gladys, this.park(code), language));
    const signature = JSON.stringify(devices.map((d) => [d.external_id, d.name, d.features]));
    if (!force && signature === this.discoveredSignature) {
      return;
    }
    try {
      await this.gladys.publishDiscoveredDevices(devices);
      this.discoveredSignature = signature;
      if (this.discoveryFailed) {
        this.discoveryFailed = false;
        logger.info('Discovered devices published again');
      }
    } catch (err) {
      if (!this.discoveryFailed) {
        logger.warn(`Cannot publish the discovered devices: ${err.message}`);
      }
      this.discoveryFailed = true;
    }
  }

  async publish(states) {
    if (states.length === 0) {
      return;
    }
    try {
      await this.gladys.publishChangedStates(states, { heartbeat: HEARTBEAT_MS });
      if (this.publishFailed) {
        this.publishFailed = false;
        logger.info('States published again');
      }
    } catch (err) {
      if (!this.publishFailed) {
        logger.warn(`Cannot publish ${states.length} state(s): ${err.message}`);
      }
      this.publishFailed = true;
    }
  }

  statesOf(code) {
    const park = this.parks.get(code);
    return park ? parkStates(this.gladys, this.parkView(park), this.config.language) : [];
  }

  refreshWidget() {
    this.gladys.requestWidgetRefresh?.(WIDGET_KEY)?.catch?.(() => {});
  }

  /** A park was just added in Gladys: its states, all of them, now. */
  async onDeviceCreated(device) {
    const code = NationalParks.codeOf(device);
    if (code) {
      await this.publish(this.statesOf(code));
    }
    this.refreshWidget();
  }

  async setStatus(key) {
    if (key === this.statusKey) {
      return;
    }
    this.statusKey = key;
    await (
      key
        ? this.gladys.setConnectionStatus(false, STATUS[key])
        : this.gladys.setConnectionStatus(true)
    ).catch(() => {
      // Sent again at the next reading.
      this.statusKey = undefined;
    });
  }

  // --- reading ----------------------------------------------------------------

  /**
   * One reading of every active park; concurrent calls share it. `ifDue`
   * (the core's poll, a fallback) skips it when the last one is recent.
   */
  refresh({ discover = false, ifDue = false, ifFresh = false } = {}) {
    // A scan or a reconnection right after a reading: republish what is
    // known, without spending the quota (DEMO_KEY: 10 requests an hour).
    if (ifFresh && this.okAt !== null && this.now() - this.okAt < FRESH_MS) {
      return this.republish();
    }
    if (
      ifDue &&
      this.okAt !== null &&
      this.now() - this.okAt < (this.config.refreshMinutes * MINUTE) / 2
    ) {
      return Promise.resolve();
    }
    if (!this.refreshing) {
      this.refreshing = this.refreshAll(discover)
        .catch((err) => logger.warn(`Refresh failed: ${err.message}`))
        .finally(() => {
          this.refreshing = null;
        });
      return this.refreshing;
    }
    return discover ? this.refreshing.then(() => this.refresh({ discover })) : this.refreshing;
  }

  async republish() {
    if (this.statusKey === undefined) {
      await this.setStatus(this.error?.key ?? null);
    }
    await this.publishDiscovered({ force: true });
    await this.publish(this.watched().flatMap((entry) => this.statesOf(entry.code)));
  }

  async refreshAll(forceDiscovery) {
    const codes = this.activeCodes();
    if (codes.length > 0 && this.now() >= this.backoffUntil) {
      await this.readNames(codes);
      const events = await this.readAlerts(codes);
      if (events) {
        await this.readEventsIfDue(codes);
        for (const event of events) {
          await this.fire(TRIGGERS.NEW_ALERT, event);
        }
      }
    } else if (codes.length === 0) {
      await this.setStatus(null);
    }
    await this.publishDiscovered({ force: forceDiscovery });
    await this.publish(this.watched().flatMap((entry) => this.statesOf(entry.code)));
    const signature = JSON.stringify(
      codes.map((code) => [code, this.parks.get(code)?.alerts?.map((a) => a.id)]),
    );
    if (signature !== this.alertsSignature) {
      this.alertsSignature = signature;
      this.refreshWidget();
    }
  }

  /** The names and zones of the sites typed by code, once per list of codes. */
  async readNames(codes) {
    const missing = codes.filter((code) => !KNOWN.has(code));
    const key = missing.join(',');
    if (missing.length === 0 || key === this.namesCodes) {
      return;
    }
    try {
      const found = await readParks(this.fetch, this.config.apiKey, missing, this.now());
      for (const code of missing) {
        const info = found.get(code);
        const park = this.park(code);
        if (info) {
          const zone = safeZone(STATE_ZONES[info.states[0]] ?? park.zone);
          if (zone !== park.zone) {
            // Events already placed in the wrong zone: read again.
            this.eventsAt = null;
          }
          park.name = info.name;
          park.zone = zone;
          park.named = true;
        }
      }
      const unknown = missing.filter((code) => !found.has(code));
      if (unknown.length > 0 && unknown.join() !== this.unknown.join()) {
        logger.warn(`Codes unknown to the NPS: ${unknown.join(', ')}`);
      }
      this.unknown = unknown;
      this.namesCodes = key;
    } catch (err) {
      // Read again next time; the alerts tell what is wrong.
      logger.debug(`Park names unavailable: ${err.message}`);
    }
  }

  /** Reads the alerts of every park; returns the trigger events, or null on failure. */
  async readAlerts(codes) {
    const now = this.now();
    let alerts;
    try {
      alerts = await readAlerts(this.fetch, this.config.apiKey, codes, now);
    } catch (err) {
      await this.failed(err, now);
      return null;
    }
    if (this.error) {
      logger.info('NPS API: alerts available again');
    }
    this.error = null;
    this.okAt = now;
    await this.setStatus(null);
    const byPark = new Map(codes.map((code) => [code, []]));
    for (const alert of alerts) {
      byPark.get(alert.park)?.push(alert);
    }
    const watched = new Map(this.watched().map((entry) => [entry.code, entry]));
    const events = [];
    let changed = false;
    for (const [code, list] of byPark) {
      const park = this.park(code);
      park.alerts = list;
      const ids = list.map((alert) => alert.id);
      const before = this.seen[code];
      const entry = watched.get(code);
      // News only for a park added to Gladys and already read once: a first
      // reading (new park, lost file) only records what is there.
      if (Array.isArray(before) && entry) {
        for (const alert of list.filter((a) => !before.includes(a.id))) {
          events.push(this.alertEvent(park, entry, alert));
        }
      }
      if (!Array.isArray(before) || before.join() !== ids.join()) {
        this.seen[code] = ids;
        changed = true;
      }
    }
    for (const code of Object.keys(this.seen)) {
      if (!byPark.has(code)) {
        delete this.seen[code];
        changed = true;
      }
    }
    if (changed) {
      this.store.save({ seen: this.seen });
    }
    logger.debug(`${alerts.length} alert(s) read for ${codes.length} park(s)`);
    return events;
  }

  alertEvent(park, entry, alert) {
    const language = this.config.language;
    return {
      park: entry.deviceId,
      park_name: park.name,
      category: alert.category,
      category_name: say(TEXT, language, `category_${alert.category}`),
      title: alert.title,
      text: alertText(alert, language),
      url: alert.url ?? '',
    };
  }

  pause(err, now) {
    this.backoffUntil = now + Math.min(err.retryAfterMs ?? RATE_LIMIT_PAUSE_MS, MAX_PAUSE_MS);
  }

  async failed(err, now) {
    const key = statusOf(err);
    if (key === 'rateLimit') {
      this.pause(err, now);
    }
    if (this.error?.key !== key) {
      const hint =
        key === 'rateLimit'
          ? `, paused for ${Math.round((this.backoffUntil - now) / MINUTE)} min${this.config.demoKey ? ' (DEMO_KEY: get your own key)' : ''}`
          : '';
      logger.warn(`NPS API: alerts unavailable: ${err.message}${hint}`);
    }
    this.error = { key, message: err.message };
    await this.setStatus(key);
  }

  /** The events, every six hours and at each new day (date of the US east coast). */
  async readEventsIfDue(codes) {
    const now = this.now();
    const day = localDate(now, 'America/New_York');
    const key = codes.join(',');
    if (
      this.eventsAt !== null &&
      now - this.eventsAt < EVENTS_MS &&
      this.eventsDay === day &&
      this.eventsCodes === key
    ) {
      return;
    }
    // From the day before: in Hawaii or Alaska, the east coast's day may not
    // have started yet.
    const from = addDays(day, -1);
    try {
      const { events, complete } = await readEvents(this.fetch, this.config.apiKey, codes, {
        from,
        to: addDays(from, EVENT_DAYS),
        zoneOf: (code) => this.park(code).zone,
        now,
      });
      for (const code of codes) {
        const own = events.filter((event) => event.park === code);
        // Past the page cap, a park without events read may have some
        // further on: "unknown" (last value kept), never "no event".
        this.park(code).events = own.length > 0 || complete ? own : null;
      }
      if (!complete) {
        logger.debug(`Events cut at ${events.length}: too many parks for one reading`);
      }
      this.eventsAt = now;
      this.eventsDay = day;
      this.eventsCodes = key;
      logger.debug(`${events.length} event(s) read`);
    } catch (err) {
      logger.debug(`Events unavailable: ${err.message}`);
      if (statusOf(err) === 'rateLimit') {
        this.pause(err, now);
      }
    }
  }

  async fire(key, data) {
    try {
      await this.gladys.publishSceneEvent(key, data);
      if (this.fireFailed) {
        this.fireFailed = false;
        logger.info('Scene triggers fired again');
      }
    } catch (err) {
      if (!this.fireFailed) {
        logger.warn(`Cannot fire the ${key} trigger: ${err.message}`);
      }
      this.fireFailed = true;
    }
  }

  // --- texts ------------------------------------------------------------------

  /** The name to show for a park: the one given in Gladys when added. */
  displayName(code) {
    return this.watched().find((entry) => entry.code === code)?.name ?? this.park(code).name;
  }

  /** "Yosemite National Park : 2 alertes. Fermeture : …, Information : …." */
  sentence(code, language) {
    const park = this.parks.get(code);
    const name = this.displayName(code);
    if (!park?.alerts) {
      return `${name}: ${say(TEXT, language, 'stale')}.`;
    }
    return say(TEXT, language, 'sentence', {
      name,
      count: park.alerts.length,
      list: park.alerts.map((alert) => alertText(alert, language)).join(' ; '),
    });
  }

  status() {
    const now = this.now();
    const blocks = [];
    if (this.config.parks.length === 0) {
      blocks.push(render(REPORTS, 'noPark'));
    }
    if (this.config.demoKey) {
      blocks.push(render(REPORTS, 'demoKey'));
    }
    if (this.config.invalidParks.length > 0) {
      blocks.push(render(REPORTS, 'invalid', { codes: this.config.invalidParks.join(', ') }));
    }
    if (this.unknown.length > 0) {
      blocks.push(render(REPORTS, 'unknown', { codes: this.unknown.join(', ') }));
    }
    for (const code of this.activeCodes()) {
      const park = this.park(code);
      blocks.push(
        render(REPORTS, 'park', { name: park.name, code, count: park.alerts?.length ?? 0 }),
      );
    }
    blocks.push(
      this.okAt === null
        ? render(REPORTS, 'waiting')
        : render(REPORTS, 'read', { age: Math.round((now - this.okAt) / MINUTE) }),
      this.error
        ? lines(
            STATUS[this.error.key],
            render(REPORTS, 'error', this.error.message ? { error: this.error.message } : {}),
          )
        : null,
      render(REPORTS, 'watched', { count: this.watched().length }),
    );
    return lines(...blocks);
  }
}

export { PARK_TYPE, parkIds };
