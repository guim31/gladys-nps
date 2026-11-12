// -----------------------------------------------------------------------------
// One Gladys device per followed park, external id `nps:park:<code>` (the NPS
// park code, stable).
//
// Features (couples checked against the Gladys front, see
// test/gladys-rules.test.js):
//   - closure_alerts, danger_alerts, caution_alerts, information_alerts
//                   counter-sensor/integer: the current alerts of each NPS
//                   category ("Park Closure", "Danger", "Caution",
//                   "Information");
//   - closure       input/binary: 1 while a "Park Closure" alert is posted
//                   (often a partial closure: a road, a trail, an area);
//   - alert_level   risk/integer: 0 no alert, 1 information, 2 caution,
//                   3 danger or closure (the front's risk badge);
//   - top_alert     text/text: the most serious alert, "Danger : <title>";
//   - next_event    text/text: the next event of the park calendar, at the
//                   park's local time.
//
// Published with should_poll: false: the refresh runs in the container
// (src/service.js), the core only polls up to one minute.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as CATEGORIES,
  DEVICE_FEATURE_TYPES as TYPES,
} from '@gladysassistant/integration-sdk';
import { CATEGORIES as ALERT_CATEGORIES } from './nps.js';
import { NAMES, TEXT, say } from './messages.js';
import { formatWhen } from './time.js';

export const PARK_TYPE = 'park';
export const MAX_COUNT = 1000;
export const MAX_TEXT = 200;

export const COUNT_FEATURES = ALERT_CATEGORIES.map((c) => `${c.key}_alerts`);
export const FEATURES = [...COUNT_FEATURES, 'closure', 'alert_level', 'top_alert', 'next_event'];

// Risk level of each category (alert_level, widget colors).
export const LEVELS = { closure: 3, danger: 3, caution: 2, information: 1 };

/** Cuts a text to `max` characters, with an ellipsis. */
export function clip(text, max) {
  const value = String(text ?? '');
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

/** External ids of a park device and of its features. */
export function parkIds(gladys, code) {
  const ids = gladys.externalIds(PARK_TYPE, code);
  return {
    device: ids.device,
    ...Object.fromEntries(FEATURES.map((key) => [key, ids.feature(key)])),
  };
}

const sensor = (name, externalId, category, type, extra) => ({
  name,
  external_id: externalId,
  category,
  type,
  read_only: true,
  has_feedback: false,
  ...extra,
});

/** The discovery payload of a park. */
export function buildParkDevice(gladys, park, language = 'fr') {
  const ids = parkIds(gladys, park.code);
  const names = NAMES[language] ?? NAMES.fr;
  const counter = (key) =>
    sensor(names[key], ids[key], CATEGORIES.COUNTER_SENSOR, TYPES.SENSOR.INTEGER, {
      keep_history: true,
      min: 0,
      max: MAX_COUNT,
    });
  const text = (key) =>
    sensor(names[key], ids[key], CATEGORIES.TEXT, TYPES.TEXT.TEXT, {
      keep_history: false,
      min: 0,
      max: 0,
    });
  return {
    name: park.name,
    external_id: ids.device,
    model: 'National Park Service',
    should_poll: false,
    params: [{ name: 'park_code', value: park.code }],
    features: [
      ...COUNT_FEATURES.map(counter),
      sensor(names.closure, ids.closure, CATEGORIES.INPUT, TYPES.SENSOR.BINARY, {
        keep_history: true,
        min: 0,
        max: 1,
      }),
      sensor(names.alert_level, ids.alert_level, CATEGORIES.RISK, TYPES.RISK.INTEGER, {
        keep_history: true,
        min: 0,
        max: 3,
      }),
      text('top_alert'),
      text('next_event'),
    ],
  };
}

/** The alerts of a park sorted from the most serious (NPS order kept within a category). */
export function sortAlerts(alerts) {
  const rank = new Map(ALERT_CATEGORIES.map((c, index) => [c.key, index]));
  return [...alerts].sort((a, b) => rank.get(a.category) - rank.get(b.category));
}

/** "Danger : INNER CANYON WATER SHUTOFFS". */
export function alertText(alert, language) {
  return say(TEXT, language, 'alert', {
    category: say(TEXT, language, `category_${alert.category}`),
    title: alert.title,
  });
}

/**
 * The states of a park device.
 * @param {object} park { code, zone, alerts (array|null), next ({ event, start, allDay }|null), eventsKnown }
 */
export function parkStates(gladys, park, language) {
  const ids = parkIds(gladys, park.code);
  const states = [];
  if (park.alerts) {
    const sorted = sortAlerts(park.alerts);
    for (const category of ALERT_CATEGORIES) {
      states.push({
        device_feature_external_id: ids[`${category.key}_alerts`],
        state: sorted.filter((alert) => alert.category === category.key).length,
      });
    }
    states.push(
      {
        device_feature_external_id: ids.closure,
        state: sorted.some((alert) => alert.category === 'closure') ? 1 : 0,
      },
      {
        device_feature_external_id: ids.alert_level,
        state: sorted.length > 0 ? LEVELS[sorted[0].category] : 0,
      },
      {
        device_feature_external_id: ids.top_alert,
        text:
          sorted.length > 0
            ? clip(alertText(sorted[0], language), MAX_TEXT)
            : say(TEXT, language, 'noAlert'),
      },
    );
  }
  if (park.eventsKnown) {
    states.push({
      device_feature_external_id: ids.next_event,
      text: park.next
        ? clip(
            say(TEXT, language, 'event', {
              when: formatWhen(park.next.start, park.next.allDay, park.zone, language),
              title: park.next.event.title,
            }),
            MAX_TEXT,
          )
        : say(TEXT, language, 'noEvent'),
    });
  }
  return states;
}
