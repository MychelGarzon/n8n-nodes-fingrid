import type { IDataObject, IExecuteFunctions } from "n8n-workflow";
import { NodeOperationError } from "n8n-workflow";

export const BASE_URL = "https://data.fingrid.fi/api";

export const PAGINATED_OPERATIONS = [
  "search",
  "getData",
  "getFileData",
  "getMultiple",
  "getUpdated",
];

// Fingrid's API allows 10 requests/minute. When Return All auto-follows
// pages, we throttle between requests the same way Fingrid's own official
// client does, so a large fetch doesn't trip the rate limit mid-execution.
const MIN_REQUEST_INTERVAL_MS = 6500;
let lastRequestTimestamp = 0;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function respectRateLimit(): Promise<void> {
  const elapsed = Date.now() - lastRequestTimestamp;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
  }
  lastRequestTimestamp = Date.now();
}

export interface RequestParams {
  endpoint: string;
  qs: IDataObject;
}

function buildDatasetRequest(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): RequestParams {
  const qs: IDataObject = {};

  if (operation === "get") {
    const datasetId = this.getNodeParameter("datasetId", i) as string;
    return { endpoint: `/datasets/${datasetId}`, qs };
  }
  if (operation === "search") {
    const search = this.getNodeParameter("search", i) as string;
    const orderBy = this.getNodeParameter("orderBy", i) as string;
    if (search) qs.search = search;
    if (orderBy) qs.orderBy = orderBy;
    Object.assign(
      qs,
      this.getNodeParameter("additionalOptions", i, {}) as IDataObject,
    );
    return { endpoint: "/datasets", qs };
  }
  if (operation === "getData") {
    const datasetId = this.getNodeParameter("datasetId", i) as string;
    qs.startTime = this.getNodeParameter("startTime", i) as string;
    qs.endTime = this.getNodeParameter("endTime", i) as string;
    Object.assign(
      qs,
      this.getNodeParameter("additionalOptions", i, {}) as IDataObject,
    );
    return { endpoint: `/datasets/${datasetId}/data`, qs };
  }
  if (operation === "getLatestData") {
    const datasetId = this.getNodeParameter("datasetId", i) as string;
    return { endpoint: `/datasets/${datasetId}/data/latest`, qs };
  }
  if (operation === "getFile") {
    const datasetId = this.getNodeParameter("datasetId", i) as string;
    const fileId = this.getNodeParameter("fileId", i) as string;
    return { endpoint: `/datasets/${datasetId}/files/${fileId}`, qs };
  }
  if (operation === "getFileData") {
    const datasetId = this.getNodeParameter("datasetId", i) as string;
    qs.startTime = this.getNodeParameter("startTime", i) as string;
    qs.endTime = this.getNodeParameter("endTime", i) as string;
    Object.assign(
      qs,
      this.getNodeParameter("additionalOptions", i, {}) as IDataObject,
    );
    return { endpoint: `/datasets/${datasetId}/files`, qs };
  }

  throw new NodeOperationError(
    this.getNode(),
    `Unknown dataset operation "${operation}"`,
    {
      itemIndex: i,
    },
  );
}

function buildDataRequest(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): RequestParams {
  const datasetsRaw = this.getNodeParameter("datasets", i) as string;
  const qs: IDataObject = {
    datasets: datasetsRaw
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d.length > 0)
      .join(","),
  };

  if (operation === "getMultiple") {
    qs.startTime = this.getNodeParameter("startTime", i) as string;
    qs.endTime = this.getNodeParameter("endTime", i) as string;
    Object.assign(
      qs,
      this.getNodeParameter("additionalOptions", i, {}) as IDataObject,
    );
    return { endpoint: "/data", qs };
  }
  if (operation === "getUpdated") {
    qs.days = this.getNodeParameter("days", i) as number;
    Object.assign(
      qs,
      this.getNodeParameter("additionalOptions", i, {}) as IDataObject,
    );
    return { endpoint: "/data/updates", qs };
  }

  throw new NodeOperationError(
    this.getNode(),
    `Unknown data operation "${operation}"`,
    {
      itemIndex: i,
    },
  );
}

function buildSystemRequest(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): RequestParams {
  if (operation === "getActiveNotifications") {
    return { endpoint: "/notifications/active", qs: {} };
  }
  if (operation === "getHealthStatus") {
    return { endpoint: "/health", qs: {} };
  }

  throw new NodeOperationError(
    this.getNode(),
    `Unknown system operation "${operation}"`,
    {
      itemIndex: i,
    },
  );
}

export function buildRequestParams(
  this: IExecuteFunctions,
  resource: string,
  operation: string,
  i: number,
): RequestParams {
  if (resource === "dataset")
    return buildDatasetRequest.call(this, operation, i);
  if (resource === "data") return buildDataRequest.call(this, operation, i);
  if (resource === "system") return buildSystemRequest.call(this, operation, i);

  throw new NodeOperationError(
    this.getNode(),
    `Unknown resource "${resource}"`,
    {
      itemIndex: i,
    },
  );
}

export async function fetchPaginated(
  this: IExecuteFunctions,
  endpoint: string,
  qs: IDataObject,
  i: number,
): Promise<IDataObject[]> {
  const returnAll = this.getNodeParameter("returnAll", i, false) as boolean;
  const limit = this.getNodeParameter("limit", i, 50) as number;
  const pageSize = (qs.pageSize as number) || 20000;

  const collected: IDataObject[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    await respectRateLimit();

    const pageQs: IDataObject = { ...qs, page, pageSize };
    const response = await this.helpers.httpRequestWithAuthentication.call(
      this,
      "fingridApi",
      { method: "GET", url: `${BASE_URL}${endpoint}`, qs: pageQs, json: true },
    );

    const pageData = Array.isArray(response)
      ? (response as IDataObject[])
      : (((response as IDataObject).data as IDataObject[] | undefined) ?? []);
    collected.push(...pageData);

    const pagination = (response as IDataObject).pagination as
      IDataObject | undefined;
    lastPage = pagination ? (pagination.lastPage as number) : 1;

    if (!returnAll && collected.length >= limit) break;
    page += 1;
  } while (returnAll && page <= lastPage);

  return returnAll ? collected : collected.slice(0, limit);
}

export async function fetchSingle(
  this: IExecuteFunctions,
  endpoint: string,
  qs: IDataObject,
): Promise<IDataObject[]> {
  const responseData = await this.helpers.httpRequestWithAuthentication.call(
    this,
    "fingridApi",
    { method: "GET", url: `${BASE_URL}${endpoint}`, qs, json: true },
  );

  if (Array.isArray(responseData)) {
    return responseData as IDataObject[];
  }
  if (
    responseData &&
    typeof responseData === "object" &&
    Array.isArray((responseData as IDataObject).data)
  ) {
    return (responseData as IDataObject).data as IDataObject[];
  }
  return [responseData as IDataObject];
}
