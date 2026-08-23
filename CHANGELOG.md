# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.6] - 2026-08-24

### Fixed

- Resolved all findings from `@n8n/scan-community-package` verification scan:
  - Added missing `icon` property to the credentials class
  - Added `usableAsTool: true` to the node description
  - Switched `inputs`/`outputs` from string literals to `NodeConnectionTypes.Main`
  - Wrapped all raw error re-throws in `NodeApiError`
  - Replaced custom `setTimeout`-based sleep with n8n-workflow's own `sleep` helper
  - Added a required author email to `package.json`
  - Added a genuinely distinct dark-theme icon variant (previously pointed
    both light and dark at the same file)
- Renamed `Search` → `Get Many` (Dataset resource) to align with n8n's
  controlled operation-naming vocabulary
- Updated `Simplify`'s description to match n8n's suggested exact wording

## [0.2.0] - 2026-08-23

### Added

- Initial Fingrid Open Data node covering Dataset, Data, and System resources
- API key credential with authentication test against `/health`
- Pagination support (`Return All` / `Limit`) with automatic rate-limit throttling
- `Simplify` toggle for streamlined output on time-series operations
- Dataset ID resource locator with live search against Fingrid's dataset catalog
- `Get File` / `Get File Data` operations
- SonarCloud integration for code quality analysis
- Jest test suite covering request-building logic
- GitHub Actions CI (lint, build, test on every push/PR)
- GitHub Actions publish workflow with npm provenance
- MIT LICENSE file

### Fixed

- Corrected rate-limit interval to Fingrid's documented 1 request per 2 seconds
  (previously based on an inaccurate third-party client assumption)
- Surfaced Fingrid's own 429 rate-limit message instead of a generic HTTP error
- Fixed a copy-paste error message that showed the wrong parameter name when
  an invalid resource was selected
- Fixed `Simplify` being applied to operations whose response shape it
  doesn't match (dataset metadata, file, notification, and health-status
  responses were being silently reduced to empty fields)
- Excluded test files from the published package
- Removed a dangling `main` field pointing to a non-existent file

### Changed

- Refactored `execute()` to delegate to helper functions in `GenericFunctions.ts`,
  reducing Cognitive Complexity from 67 to within SonarCloud's allowed threshold
- Renamed `Get Multiple` → `Get Many` and `Get Updated` → `Get Recently Updated`
  to align with n8n's standard operation naming conventions
- Hardened CI/publish workflows with `--ignore-scripts` on dependency install
