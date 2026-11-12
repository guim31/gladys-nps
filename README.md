# Gladys US National Parks (NPS)

A [Gladys Assistant](https://gladysassistant.com) external integration: the
**alerts, closures and events** of the US national parks you follow
(Yosemite, Yellowstone, Grand Canyon…), from the official
[National Park Service API](https://www.nps.gov/subjects/developer/api-documentation.htm).

Not affiliated with the National Park Service. The NPS arrowhead is a protected
emblem: neither the integration nor its cover uses it.

User guide: [English](docs/en.md) · [Français](docs/fr.md) ·
[Deutsch](docs/de.md) · [Español](docs/es.md).

## What you get in Gladys

- One device per park: current alerts per NPS category (closure, danger,
  caution, information), "closure in progress", an alert level (0–3), the most
  serious alert and the next event of the park calendar as text.
- A dashboard widget with the current alerts, most serious first.
- A scene trigger "New park alert" (filters: park, category).
- A scene action that reads the alerts as a sentence, with counts.

## Requirements

- Gladys Assistant 5.3.0 or later, with Internet access.
- A free API key from api.data.gov
  ([get one](https://www.nps.gov/subjects/developer/get-started.htm)).
  Without a key, `DEMO_KEY` is used: a few requests an hour, enough to try.

## Installation

In Gladys, **Integrations → Install from GitHub**, then paste
`https://github.com/guim31/gladys-nps`. Choose your parks in the configuration,
save, and add them from the **Discover** tab.

## How it works

- One grouped `/alerts` request for every park at each refresh (30, 60 or 120
  minutes), `/events` every 6 hours and at each new day, `/parks` once for the
  sites typed by code. The key travels in the `X-Api-Key` header, never in a
  URL or a log.
- Devices are published with `should_poll: false`: the container refreshes on
  its own timer.
- An invalid key or a reached hourly limit shows on the integration page; the
  integration pauses after a limit (as the API asks, two hours at most) and keeps the last values.
- The alerts already seen are kept in `/data/nps.json`, so a restart fires no
  trigger for an old alert.

## Limitations

- "Closure in progress" means a "Park Closure" alert is posted (often a road
  or a trail), not that the whole park is closed.
- Event times are the park's local time, from the time zone of its state.
- Road conditions are not covered (the NPS puts them in the alert texts).
- Tested against the real API, without long-term use yet: feedback welcome.

## Development

```bash
npm install
npm test               # node --test, no network access
npm run lint           # ESLint
npm run format:check   # Prettier, as the CI runs it
npx github:GladysAssistant/integration-store .   # store admission checks
```

See [CLAUDE.md](CLAUDE.md) for the architecture and the conventions. The test
fixtures ([test/fixtures](test/fixtures/README.md)) are the real answers of the
NPS API, captured on 2026-11-12.

## Credits

- Data: [National Park Service](https://www.nps.gov) API, public domain (US
  government work), served through api.data.gov.
- Structure shared with
  [gladys-parcs-attractions](https://github.com/guim31/gladys-parcs-attractions).
- Built from the official
  [integration template](https://github.com/GladysAssistant/integration-template-js).

## License

[Apache 2.0](LICENSE).
