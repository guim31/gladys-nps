// -----------------------------------------------------------------------------
// Scene actions (manifest `scene_actions`, Gladys 5.1+).
//
// - read_alerts: the current alerts of the parks added to Gladys (all of
//   them, or the ones picked) as a sentence ready for a message or a speaker
//   ("Zion National Park : 2 alertes. Fermeture : …"), plus numbers for a
//   "Continue only if" step.
//
// A scene action does not receive the user's language: the sentence follows
// the `language` of the configuration. Outputs are numbers, never booleans:
// the core's "Continue only if" compares with ===.
// -----------------------------------------------------------------------------

import { sortAlerts } from './devices.js';
import { TEXT, say } from './messages.js';

export class SceneError extends Error {}

const chosenIds = (value) =>
  (Array.isArray(value) ? value : value ? [value] : []).map(String).filter(Boolean);

export const SCENE_ACTIONS = {
  async read_alerts(service, { fields }) {
    const language = service.config.language;
    // Asked right at start: the first reading, not "no data".
    await service.firstReading();
    const watched = service.watched();
    if (watched.length === 0) {
      throw new SceneError(say(TEXT, language, 'noPark'));
    }
    const asked = chosenIds(fields?.parks);
    const chosen = asked.length > 0 ? watched.filter((e) => asked.includes(e.deviceId)) : watched;
    if (chosen.length === 0) {
      throw new SceneError(say(TEXT, language, 'gone'));
    }
    const alerts = chosen.flatMap((entry) => service.parks.get(entry.code)?.alerts ?? []);
    const count = (category) => alerts.filter((alert) => alert.category === category).length;
    return {
      text: chosen.map((entry) => service.sentence(entry.code, language)).join(' '),
      count: alerts.length,
      closures: count('closure'),
      dangers: count('danger'),
      top_category: sortAlerts(alerts)[0]?.category ?? 'none',
    };
  },
};
