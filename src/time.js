// -----------------------------------------------------------------------------
// Park time. The NPS gives event dates and hours in the park's local time,
// without a zone ("2026-11-14", "06:30 PM"): they are placed in time with the
// park's zone (src/parks.js). Every function takes the time: the clock stays
// injectable.
// -----------------------------------------------------------------------------

const FALLBACK_ZONE = 'America/New_York';

const formatters = new Map();
function cached(key, make) {
  if (!formatters.has(key)) {
    formatters.set(key, make());
  }
  return formatters.get(key);
}

/** A valid IANA zone, or the fallback. */
export function safeZone(zone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return zone;
  } catch {
    return FALLBACK_ZONE;
  }
}

const partsFormatter = (zone) =>
  cached(
    `parts|${zone}`,
    () =>
      new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
  );

/** The wall clock of a zone at `ms`: { year, month, day, hour, minute, second }. */
function wallClock(ms, zone) {
  const parts = {};
  for (const part of partsFormatter(zone).formatToParts(ms)) {
    if (part.type !== 'literal') {
      parts[part.type] = Number(part.value);
    }
  }
  return parts;
}

/** "2026-11-12", the date in the zone. */
export function localDate(ms, zone) {
  const { year, month, day } = wallClock(ms, safeZone(zone));
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** The date `days` after a "YYYY-MM-DD" date. */
export function addDays(date, days) {
  const ms = Date.parse(`${date}T12:00:00Z`) + days * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** The instant of a wall-clock time in a zone (two passes: right across DST changes). */
export function zonedTime(date, hour, minute, zone) {
  const [year, month, day] = date.split('-').map(Number);
  const wanted = Date.UTC(year, month - 1, day, hour, minute);
  let guess = wanted;
  for (let pass = 0; pass < 2; pass += 1) {
    const seen = wallClock(guess, zone);
    const seenMs = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute);
    guess += wanted - seenMs;
  }
  return guess;
}

/** "06:30 PM" → { hour: 18, minute: 30 }, or null. */
export function parseClock(value) {
  const match = /^\s*(\d{1,2}):(\d{2})\s*([AP]M)?\s*$/i.exec(String(value ?? ''));
  if (!match) {
    return null;
  }
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hour < 12) {
    hour += 12;
  } else if (meridiem === 'AM' && hour === 12) {
    hour = 0;
  }
  return hour < 24 && minute < 60 ? { hour, minute } : null;
}

/**
 * The occurrences of an event of the API, sorted: `{ start, allDay }`, from
 * its `dates` and each of its `times`, minus the cancelled dates.
 */
export function eventOccurrences(raw, zone) {
  const safe = safeZone(zone);
  const cancelled = new Set(Array.isArray(raw?.cancelleddatelist) ? raw.cancelleddatelist : []);
  const dates = (Array.isArray(raw?.dates) ? raw.dates : []).filter(
    (date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !cancelled.has(date),
  );
  // An event can run several times a day (a 10:00 and a 14:00 tour).
  const clocks =
    String(raw?.isallday) === 'true'
      ? []
      : (Array.isArray(raw?.times) ? raw.times : [])
          .map((time) => parseClock(time?.timestart))
          .filter(Boolean);
  return dates
    .flatMap((date) =>
      clocks.length > 0
        ? clocks.map((clock) => ({
            start: zonedTime(date, clock.hour, clock.minute, safe),
            allDay: false,
          }))
        : [{ start: zonedTime(date, 0, 0, safe), allDay: true, date }],
    )
    .sort((a, b) => a.start - b.start);
}

/**
 * The next occurrence not over at `now` among events: a timed one not started
 * yet, an all-day one whose day (at the park) is not over. `{ event, start, allDay }` or null.
 */
export function nextEvent(events, now, zone) {
  const today = localDate(now, zone);
  let best = null;
  for (const event of events ?? []) {
    const next = event.occurrences.find((o) => (o.allDay ? o.date >= today : o.start >= now));
    if (next && (!best || next.start < best.start)) {
      best = { event, start: next.start, allDay: next.allDay };
    }
  }
  return best;
}

const LOCALES = { en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' };

/** "sam. 14 nov., 18:30" in the language, at the park's time. */
export function formatWhen(ms, allDay, zone, language) {
  const safe = safeZone(zone);
  const locale = LOCALES[language] ?? LOCALES.en;
  return cached(
    `when|${safe}|${locale}|${allDay}`,
    () =>
      new Intl.DateTimeFormat(locale, {
        timeZone: safe,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        ...(allDay ? {} : { hour: '2-digit', minute: '2-digit' }),
      }),
  ).format(ms);
}
