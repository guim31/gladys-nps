// -----------------------------------------------------------------------------
// Dashboard widget (manifest `widgets`, Gladys 5.1+).
//
// - alerts: the current alerts of the parks added to Gladys (all of them, or
//   the ones picked), most serious first, one status row each
//   ("Yosemite National Park · Fermeture" / "Tioga Road and Glacier Point…"),
//   red for closures and dangers, orange for cautions, blue for
//   information; grey when out of date. Above, a caption with the count per
//   park; below, a link to the park's conditions page when one park is
//   shown. The information alerts, the caption and the link can be hidden.
//
// Budget of the core: 8 components, 2 texts, 1 status (10 rows), 1 button.
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { clip, sortAlerts } from './devices.js';
import { TEXT, say } from './messages.js';
import { WIDGET_KEY } from './service.js';

export const MAX_ROWS = 10;
const MAX_LABEL = 40;
const MAX_CAPTION = 120;

const COLORS = {
  closure: WIDGET_COLORS.DANGER,
  danger: WIDGET_COLORS.DANGER,
  caution: WIDGET_COLORS.WARNING,
  information: WIDGET_COLORS.INFO,
};

/** The conditions page of a park on nps.gov. */
export const conditionsUrl = (code) => `https://www.nps.gov/${code}/planyourvisit/conditions.htm`;

async function alertsContent(service, { settings, language }) {
  await service.firstReading();
  const ttl = Math.max(300, Math.round((service.config.refreshMinutes * 60) / 2));
  const watched = service.watched();
  const chosen = Array.isArray(settings?.parks) ? settings.parks.map(String) : [];
  const entries =
    chosen.length > 0 ? watched.filter((entry) => chosen.includes(entry.deviceId)) : watched;
  if (entries.length === 0) {
    const key = chosen.length > 0 && watched.length > 0 ? 'gone' : 'pickPark';
    return { ttl_seconds: ttl, components: [{ type: 'text', text: say(TEXT, language, key) }] };
  }
  const read = entries.filter((entry) => service.parks.get(entry.code)?.alerts);
  if (read.length === 0) {
    return {
      ttl_seconds: 60,
      components: [{ type: 'text', variant: 'caption', text: say(TEXT, language, 'waiting') }],
    };
  }
  const showInformation = settings?.show_information !== false;
  const stale = service.isStale();
  const rows = read.flatMap((entry) =>
    service.parks
      .get(entry.code)
      .alerts.filter((alert) => showInformation || alert.category !== 'information')
      .map((alert) => ({ entry, alert })),
  );
  const sorted = sortAlerts(rows.map((row) => ({ ...row.alert, row }))).map((a) => a.row);
  const components = [];
  if (settings?.show_summary !== false) {
    const summary = read
      .map((entry) =>
        say(TEXT, language, 'parkLine', {
          name: entry.name,
          count: say(TEXT, language, 'alerts', {
            count: rows.filter((row) => row.entry === entry).length,
          }),
        }),
      )
      .join(' · ');
    components.push({
      type: 'text',
      variant: 'caption',
      text: clip(stale ? `${summary} (${say(TEXT, language, 'stale')})` : summary, MAX_CAPTION),
    });
  }
  if (sorted.length === 0) {
    components.push({ type: 'text', text: say(TEXT, language, 'allClear') });
  } else {
    components.push({
      type: 'status',
      items: sorted.slice(0, MAX_ROWS).map(({ entry, alert }) => ({
        // The name given in Gladys, not the API's.
        label: clip(
          read.length > 1
            ? `${entry.name} · ${say(TEXT, language, `category_${alert.category}`)}`
            : say(TEXT, language, `category_${alert.category}`),
          MAX_LABEL,
        ),
        value: clip(alert.title, 40),
        color: stale ? WIDGET_COLORS.NEUTRAL : COLORS[alert.category],
      })),
    });
  }
  if (settings?.show_link !== false && read.length === 1) {
    components.push({
      type: 'button',
      label: say(TEXT, language, 'link'),
      icon: 'external-link',
      style: 'secondary',
      link: { url: conditionsUrl(read[0].code) },
    });
  }
  return { ttl_seconds: ttl, components };
}

export const WIDGETS = {
  [WIDGET_KEY]: { get: alertsContent },
};
