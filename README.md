# n8n-nodes-fingrid

[![Quality gate status](https://sonarcloud.io/api/project_badges/measure?project=MychelGarzon_n8n-nodes-fingrid&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=MychelGarzon_n8n-nodes-fingrid)

n8n community node for [Fingrid Open Data](https://data.fingrid.fi/en) — real-time and historical
Finnish power grid and electricity market data (frequency, power system state, electricity shortage
status, production/consumption, cross-border transmission, balancing and reserve markets).

**Not affiliated with, endorsed by, or sponsored by Fingrid Oyj.**

## Data license

Fingrid's data is published under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Attribution required when displaying or republishing the data:

> Source Fingrid / data.fingrid.fi, license CC 4.0 BY

This node is free and open-source. If you plan to build a commercial product on top of
Fingrid's data, review [Fingrid's Legal Terms](https://data.fingrid.fi/en) directly, as a
separate general terms page contains language that may not apply to non-commercial use.

## Prerequisites

You need a free Fingrid Open Data API key:

1. Go to https://data.fingrid.fi/en and sign up (email only, no company/business account required)
2. Approve the license and terms of use
3. You'll receive a personal API key by email immediately
4. Rate limits: 10 requests/minute, 10,000/day

## Resources & operations

- **Dataset**
  - Get — metadata for a single dataset by ID
  - Search — search/list all public datasets
  - Get Data — time series data for a dataset within a time range
  - Get Latest Data — most recent data point for a dataset
  - Get File — a single dataset file
  - Get File Data — file-based data within a time range
- **Data (multiple datasets)**
  - Get Multiple — time series data for several datasets in one call
  - Get Updated — data for datasets changed within a recent period
- **System**
  - Get Active Notifications
  - Get Health Status

## Finding dataset IDs

Use the **Dataset → Search** operation (with or without search text) to browse available datasets
and find their numeric IDs, or browse https://data.fingrid.fi/en/datasets in a browser.

## Development

```bash
npm install
npm run build
npm run lint
```

## License

MIT
