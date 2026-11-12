// -----------------------------------------------------------------------------
// The NPS API (https://www.nps.gov/subjects/developer/api-documentation.htm):
// one grouped request for the alerts of every followed park, the events of
// the coming weeks (50 per page at most, the API's cap), and the names of
// the sites typed by code. The key travels in the X-Api-Key header, never in
// a URL that could end up in a log.
// -----------------------------------------------------------------------------

import { getJson } from './http.js';
import { eventOccurrences } from './time.js';

export const API_URL = 'https://developer.nps.gov/api/v1';

// Alert categories of the NPS, from the most to the least serious, and the
// stable keys the integration gives them (features, triggers, widget).
export const CATEGORIES = [
  { key: 'closure', api: 'Park Closure' },
  { key: 'danger', api: 'Danger' },
  { key: 'caution', api: 'Caution' },
  { key: 'information', api: 'Information' },
];
const CATEGORY_KEYS = new Map(CATEGORIES.map((c) => [c.api.toLowerCase(), c.key]));

// The API serves at most 50 events per page: beyond a few pages, the events
// of the next days are already known.
export const EVENT_PAGE_SIZE = 50;
export const MAX_EVENT_PAGES = 4;
const MAX_ALERTS = 500;

const query = (params) =>
  Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

export const alertsUrl = (codes, start = 0) =>
  `${API_URL}/alerts?${query({ parkCode: codes.join(','), limit: MAX_ALERTS, start })}`;

export const eventsUrl = (codes, dateStart, dateEnd, page = 1) =>
  `${API_URL}/events?${query({
    parkCode: codes.join(','),
    dateStart,
    dateEnd,
    pageSize: EVENT_PAGE_SIZE,
    pageNumber: page,
  })}`;

export const parksUrl = (codes) =>
  `${API_URL}/parks?${query({ parkCode: codes.join(','), limit: 50 })}`;

const get = (fetchImpl, url, apiKey, now) =>
  getJson(fetchImpl, url, { headers: { 'x-api-key': apiKey }, now });

const text = (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

/** The category key of an alert; an unknown category counts as information. */
export const categoryOf = (value) => CATEGORY_KEYS.get(text(value).toLowerCase()) ?? 'information';

/** One alert of the API: `{ id, park, category, title, url }`. */
export function parseAlert(raw) {
  const park = text(raw?.parkCode).toLowerCase();
  const title = text(raw?.title);
  if (!park || !title) {
    return null;
  }
  return {
    id: text(raw.id) || `${park}:${title}`,
    park,
    category: categoryOf(raw.category),
    title,
    url: /^https:\/\//.test(text(raw.url)) ? text(raw.url) : null,
  };
}

/** The current alerts of the parks, every page of them. */
export async function readAlerts(fetchImpl, apiKey, codes, now) {
  const alerts = [];
  let start = 0;
  for (;;) {
    const document = await get(fetchImpl, alertsUrl(codes, start), apiKey, now);
    const data = Array.isArray(document?.data) ? document.data : [];
    alerts.push(...data.map(parseAlert).filter(Boolean));
    start += data.length;
    const total = Number(document?.total);
    if (data.length === 0 || !(start < total) || start >= 5 * MAX_ALERTS) {
      return alerts;
    }
  }
}

/**
 * The events of the parks between two dates ("YYYY-MM-DD"), with their
 * occurrences in time: `{ id, park, title, occurrences: [{ start, allDay }] }`.
 * `zoneOf(code)` gives the time zone of a park.
 */
export async function readEvents(fetchImpl, apiKey, codes, { from, to, zoneOf, now }) {
  const events = [];
  for (let page = 1; page <= MAX_EVENT_PAGES; page += 1) {
    const document = await get(fetchImpl, eventsUrl(codes, from, to, page), apiKey, now);
    const data = Array.isArray(document?.data) ? document.data : [];
    for (const raw of data) {
      const park = text(raw?.sitecode).toLowerCase();
      const title = text(raw?.title);
      if (!park || !title) {
        continue;
      }
      events.push({
        id: text(raw.id) || text(raw.eventid),
        park,
        title,
        occurrences: eventOccurrences(raw, zoneOf(park)),
      });
    }
    if (data.length < EVENT_PAGE_SIZE || page * EVENT_PAGE_SIZE >= Number(document?.total)) {
      break;
    }
  }
  return events;
}

/** Name and states of NPS sites: `Map(code → { name, states })`. */
export async function readParks(fetchImpl, apiKey, codes, now) {
  const document = await get(fetchImpl, parksUrl(codes), apiKey, now);
  const parks = new Map();
  for (const raw of Array.isArray(document?.data) ? document.data : []) {
    const code = text(raw?.parkCode).toLowerCase();
    if (code) {
      parks.set(code, {
        name: text(raw.fullName) || text(raw.name) || code,
        states: text(raw.states).split(',').filter(Boolean),
      });
    }
  }
  return parks;
}
