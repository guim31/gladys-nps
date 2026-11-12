# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

## [1.0.0] - 2026-11-12

### Added

- The US national parks you follow, from the official National Park Service
  API: one device per park with the current alerts per category (closure,
  danger, caution, information), closure in progress, an alert level, the most
  serious alert and the next event of the park calendar.
- The 63 national parks in the configuration, and any other NPS site by its
  code.
- A dashboard widget with the current alerts, most serious first.
- A scene trigger "New park alert", filtered by park and category.
- A scene action that reads the alerts as a sentence, with counts.
- A clear status on the integration page for an invalid key or a reached
  hourly limit; `DEMO_KEY` when no key is typed.
- Documentation in English, French, German and Spanish.

[Unreleased]: https://github.com/guim31/gladys-nps/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/guim31/gladys-nps/releases/tag/v1.0.0
