# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial Fingrid Open Data node covering Dataset, Data, and System resources
- API key credential with authentication test against `/health`
- Pagination support (`Return All` / `Limit`) with automatic rate-limit throttling
- SonarCloud integration for code quality analysis
- MIT LICENSE file

### Fixed

- Corrected rate-limit interval to Fingrid's documented 1 request per 2 seconds
  (previously based on an inaccurate third-party client assumption)
- Surfaced Fingrid's own 429 rate-limit message instead of a generic HTTP error

### Changed

- Refactored `execute()` to delegate to helper functions in `GenericFunctions.ts`,
  reducing Cognitive Complexity from 67 to within SonarCloud's allowed threshold
