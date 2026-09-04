# n8n-nodes-fingrid

[![Quality gate status](https://sonarcloud.io/api/project_badges/measure?project=MychelGarzon_n8n-nodes-fingrid&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=MychelGarzon_n8n-nodes-fingrid)

n8n community node for [Fingrid Open Data](https://data.fingrid.fi/en) — real-time and historical
Finnish power grid and electricity market data (frequency, power system state, electricity shortage
status, production/consumption, cross-border transmission, balancing and reserve markets).

**Not affiliated with, endorsed by, or sponsored by Fingrid Oyj.**

## Installation

In n8n, go to **Settings → Community Nodes → Install**, enter `n8n-nodes-fingrid`, and click **Install**.

## Data license

Fingrid's data is published under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode)
(see also the [human-readable summary](https://creativecommons.org/licenses/by/4.0/)).
Attribution required when displaying or republishing the data:

> Source Fingrid / data.fingrid.fi, license CC 4.0 BY

This data is provided "as-is" without warranties of any kind, per the license terms.

This node is free and open-source. If you plan to build a commercial product on top of
Fingrid's data, review [Fingrid's Legal Terms](https://data.fingrid.fi/en) directly, as a
separate general terms page contains language that may not apply to non-commercial use.

## Prerequisites

You need a free Fingrid Open Data API key:

1. Go to https://data.fingrid.fi/en and sign up (email only, no company/business account required)
2. Approve the license and terms of use
3. You'll receive a personal API key by email immediately
4. Rate limits: 1 request every 2 seconds, 10,000/day

## Resources & operations

- **Dataset**
  - Get — metadata for a single dataset by ID
  - Get Many — list all public datasets, optionally filtered by search text
  - Get Data — time series data for a dataset within a time range
  - Get Latest Data — most recent data point for a dataset
  - Get File — a single dataset file
  - Get File Data — file-based data within a time range
- **Data (multiple datasets)**
  - Get Many — time series data for several datasets in one call
  - Get Recently Updated — data for datasets changed within a recent period
- **System**
  - Get Active Notifications
  - Get Health Status

## Usage example

1. Add the **Fingrid** node to your workflow.
2. Set **Resource** to `Dataset` and **Operation** to `Get Data`.
3. Set **Dataset ID** to `74` (Electricity production in Finland).
4. Set a **Start Time** and **End Time**, for example `2026-08-01T00:00:00Z` to `2026-08-02T00:00:00Z`.
5. Run the node.

The output is a list of JSON objects, one per time interval, for example:

```json
{
  "value": 9605.14,
  "startTime": "2026-08-01T23:45:00.000Z",
  "endTime": "2026-08-02T00:00:00.000Z",
  "datasetId": 74
}
```

## Finding dataset IDs

Use the **Dataset → Get Many** operation (with or without search text) to browse available datasets
and find their numeric IDs, or browse https://data.fingrid.fi/en/datasets in a browser.

## Development

```bash
npm install
npm run build
npm run lint
```

## License

MIT
