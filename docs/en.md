# US National Parks (NPS)

Follow the **alerts, closures and events** of the US national parks you care
about (Yosemite, Yellowstone, Grand Canyon…) in Gladys, from the official API of
the **National Park Service** (NPS).

> Not affiliated with the National Park Service. The NPS arrowhead is a
> protected emblem: it is not used by this integration.

## What you get

- **One device per park**, with:
  - the number of current alerts in each NPS category: **closure**, **danger**,
    **caution**, **information**;
  - **closure in progress** (yes / no): a "Park Closure" alert is posted. It is
    often partial (a road, a trail, an area), rarely the whole park;
  - an **alert level**: 0 no alert, 1 information, 2 caution, 3 danger or
    closure;
  - the **most serious alert**, as text ("Closure: Tioga Road and Glacier Point
    Road will temporarily close…");
  - the **next event** of the park calendar (ranger walks, evening programs…),
    at the park's local time.
- A **dashboard widget** with the current alerts, most serious first.
- A **scene trigger** "New park alert", filtered by park and category.
- A **scene action** that reads the alerts aloud or sends them by message.

Alert titles and event names come from the NPS, in English.

## Requirements

- Gladys Assistant **5.3.0** or later.
- Internet access from Gladys.
- Optional but recommended: a free **API key** from api.data.gov.

## Installation

1. In Gladys, go to **Integrations → Install from GitHub**.
2. Paste the repository address: `https://github.com/guim31/gladys-nps`.
3. Install, then open the integration's configuration page.

## Configuration

### Settings

| Setting                        | What it does                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| NPS API key                    | Your free key. Empty: `DEMO_KEY`, shared and limited to a few requests an hour.                      |
| National parks                 | The 63 national parks.                                                                               |
| Other NPS sites                | Codes of other NPS sites (monuments, seashores, historic sites…), separated by commas: `stli, alca`. |
| Refresh                        | Every 30 minutes, every hour (default) or every 2 hours.                                             |
| Language of names and messages | Feature names (fixed when the park is added), texts, widget and scene sentences. French by default.  |

**Getting a key**: fill in the form on
[nps.gov/subjects/developer/get-started.htm](https://www.nps.gov/subjects/developer/get-started.htm)
(name and email); the key arrives at once by email. Paste it in the
**NPS API key** field and save.

**The code of a site** is the part of its nps.gov address after the domain:
`https://www.nps.gov/stli/` is `stli` (Statue of Liberty).

### Adding parks

Save the configuration: each park appears in the **Discover** tab of the
integration. Add the ones you want to Gladys. A park removed from the list
keeps working as long as its device exists in Gladys.

### Checking

The **Status** button of the configuration page lists the parks followed, their
alert counts, the last reading and the last error. An invalid key or a reached
hourly limit is also shown at the top of the integration page.

## Devices

| Feature             | Type           | Values                                                   |
| ------------------- | -------------- | -------------------------------------------------------- |
| Closure alerts      | counter        | current "Park Closure" alerts                            |
| Danger alerts       | counter        | current "Danger" alerts                                  |
| Caution alerts      | counter        | current "Caution" alerts                                 |
| Information alerts  | counter        | current "Information" alerts                             |
| Closure in progress | input (binary) | 1 while a closure alert is posted                        |
| Alert level         | risk level     | 0 none, 1 information, 2 caution, 3 danger/closure       |
| Most serious alert  | text           | "Danger: <title>", or "No alert"                         |
| Next event          | text           | "Sat, Nov 14, 06:30 PM · <title>", or "No event planned" |

The counters, the closure and the level keep their history: a chart shows how
long a road stayed closed. Use them in scenes ("when Closure alerts of
Yosemite changes", "when Alert level is 3").

## Dashboard widget

**Park alerts**: the current alerts of the parks added to Gladys, most serious
first (closures and dangers in red, cautions in orange, information in blue),
10 rows at most. Above, the count per park; below, a link to the park's
**Current conditions** page on nps.gov when a single park is shown.

Settings: the parks shown (empty: all), and switches to hide the information
alerts, the count per park and the link.

## Scene triggers

**New park alert**: the NPS posts an alert that was not there at the previous
reading, for a park added to Gladys. Filters: parks (empty: any) and categories
(closure, danger, caution, information; empty: any). Variables: park name,
category, alert title (English), "category: title" text, link to the alert.

The alerts already posted when a park is added, or when the integration
starts, do not fire it.

## Scene action

**Read the park alerts**: the current alerts of the chosen parks (empty: all)
in one sentence ("Zion National Park: 4 alerts. Closure: …"), plus numbers:
alert count, closure alerts, danger alerts, and the most serious category
(`none`, `closure`, `danger`, `caution`, `information`).

## Scene examples

- **Trip coming up**: trigger "New park alert", park Yosemite, categories
  closure and danger → send the "category: title" text and the link by message.
- **Morning briefing during a trip**: every day at 7:00 → "Read the park
  alerts" → speak the sentence.
- **Keep an eye on a road**: when "Closure alerts" of Yellowstone goes back to
  0 → send a message.

## Data and refresh

- Alerts: one grouped request for all the parks at each refresh.
- Events: one request (or a few pages of 50) every 6 hours and every new day,
  for the next 31 days.
- Site names: one request when sites are typed by code.
- api.data.gov allows **1,000 requests an hour** with a personal key; `DEMO_KEY`
  is shared by every user of an address and limited to a few requests an hour:
  enough for a test, not for daily use.
- On an invalid key or a reached limit, the integration says so on its page,
  pauses for an hour after a limit, and keeps the last values.

## Troubleshooting

- **"The NPS API key is not valid"**: check the key (no space), or empty the
  field to try with `DEMO_KEY`.
- **"Hourly limit of the NPS API reached"**: get your own key (see above).
- **A typed site does not appear**: the **Status** button lists the codes the
  NPS does not know; check the code in the nps.gov address.
- **Logs**: in Gladys, the integration's container logs; set `LOG_LEVEL=debug`
  for one line per reading.

## Limitations

- Data from the NPS: an alert appears when the park posts it, sometimes hours
  after a closure. Always check nps.gov before a trip.
- "Closure in progress" means a closure alert is posted, not that the whole
  park is closed.
- Event times are given at the park's local time (time zone of its state).
- Road conditions are not covered: the NPS gives them in the alert texts.
- Developed and tested against the real NPS API, but without a long-term run:
  feedback welcome on the forum.

## Credits

- Data: [National Park Service API](https://www.nps.gov/subjects/developer/api-documentation.htm),
  public domain (US government work), through api.data.gov.
- Not affiliated with the National Park Service. The NPS arrowhead emblem is
  not used.
- Integration by guim31, Apache 2.0 licence.
