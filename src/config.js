// -----------------------------------------------------------------------------
// Integration configuration: defaults (they mirror the `default` values of the
// manifest `config_schema`, see test/manifest.test.js) and normalization, so
// the rest of the code never deals with strings, blanks or `undefined`.
// -----------------------------------------------------------------------------

import { PARKS } from './parks.js';

export const LANGUAGES = ['en', 'fr', 'de', 'es'];

// Minutes between two readings of the alerts. The NPS updates its alerts a
// few times a day; the DEMO_KEY of api.data.gov allows only a few requests an
// hour per address. The integration drives its own timer (devices are
// published with should_poll: false, the core only polls up to one minute).
export const REFRESH_INTERVALS = ['30', '60', '120'];

// Key of api.data.gov for trying the API without signing up (rate-limited).
export const DEMO_KEY = 'DEMO_KEY';

export const DEFAULT_CONFIG = {
  api_key: '',
  parks: [],
  other_parks: '',
  refresh_interval: '60',
  language: 'fr',
};

const PARK_CODES = PARKS.map((park) => park.code);

/** A list from the form: an array, tolerating a JSON or comma-separated string. */
function listOf(value) {
  let list = value;
  if (typeof value === 'string') {
    try {
      list = JSON.parse(value);
    } catch {
      list = value.split(',');
    }
  }
  return Array.isArray(list) ? list.map((item) => String(item).trim()).filter(Boolean) : [];
}

/**
 * The other sites typed by the user: NPS codes (four letters, sometimes more),
 * separated by commas, semicolons, spaces or lines. Anything else is ignored.
 */
export function otherParksOf(value) {
  if (typeof value !== 'string') {
    return { codes: [], invalid: [] };
  }
  const codes = [];
  const invalid = [];
  for (const item of value.split(/[\s,;]+/).filter(Boolean)) {
    const code = item.toLowerCase();
    if (!/^[a-z]{4,10}$/.test(code)) {
      invalid.push(item);
    } else if (!codes.includes(code)) {
      codes.push(code);
    }
  }
  return { codes, invalid };
}

/**
 * @param {Record<string, unknown>} raw the configuration returned by the SDK
 */
export function normalizeConfig(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const interval = REFRESH_INTERVALS.includes(String(source.refresh_interval))
    ? String(source.refresh_interval)
    : DEFAULT_CONFIG.refresh_interval;
  const wanted = listOf(source.parks);
  const typedKey = typeof source.api_key === 'string' ? source.api_key.trim() : '';
  const others = otherParksOf(source.other_parks);
  const parks = PARK_CODES.filter((code) => wanted.includes(code));
  return {
    apiKey: typedKey || DEMO_KEY,
    demoKey: !typedKey || typedKey === DEMO_KEY,
    parks: [...parks, ...others.codes.filter((code) => !parks.includes(code))],
    invalidParks: others.invalid,
    language: LANGUAGES.includes(source.language) ? source.language : DEFAULT_CONFIG.language,
    refreshMinutes: Number(interval),
  };
}
