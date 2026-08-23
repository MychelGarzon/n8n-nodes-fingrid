import type {
  IDataObject,
  IExecuteFunctions,
  IHttpRequestOptions,
  JsonObject,
} from "n8n-workflow";

import { NodeApiError, NodeOperationError, sleep } from "n8n-workflow";

export const BASE_URL = "https://data.fingrid.fi/api";

export const PAGINATED_OPERATIONS = [
  "search",
  "getData",
  "getFileData",
  "getMany",
  "getUpdated",
];

// Fingrid's own API docs (instructions + FAQ) confirm the real limit is
// 1 request every 2 seconds per subscription (not the 10/minute figure
// from the community Python client's config, which was overly cautious).
// We throttle between requests during Return All so a large fetch
// doesn't trip the limit mid-execution.
const MIN_REQUEST_INTERVAL_MS = 2200;
let lastRequestTimestamp = 0;

export async function respectRateLimit(): Promise<void> {
  const elapsed = Date.now() - lastRequestTimestamp;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
  }
  lastRequestTimestamp = Date.now();
}

/**
 * Wraps an httpRequestWithAuthentication call so a 429 response surfaces
 * Fingrid's own rate-limit message clearly, instead of n8n's generic HTTP
 * error text. Confirmed via Fingrid's own FAQ: 429 means "Rate limit is
 * exceeded. Try again in 2 seconds."
 */
async function requestWithRateLimitHandling(
  this: IExecuteFunctions,
  options: IHttpRequestOptions,
  i: number,
): Promise<any> {
  try {
    return await this.helpers.httpRequestWithAuthentication.call(
      this,
      "fingridApi",
      options,
    );
  } catch (error) {
    const statusCode =
      (error as { statusCode?: number }).statusCode ??
      (error as { response?: { statusCode?: number } }).response?.statusCode;

    if (statusCode === 429) {
      throw new NodeApiError(this.getNode(), error as unknown as JsonObject, {
        message: "Fingrid API rate limit exceeded",
        description:
          "Fingrid allows 1 request every 2 seconds per API key. Wait a moment and try again, or reduce 'Page Size' if using 'Return All'.",
        itemIndex: i,
      });
    }

    throw new NodeApiError(this.getNode(), error as unknown as JsonObject, {
      itemIndex: i,
    });
  }
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
    const datasetId = this.getNodeParameter("datasetId", i, undefined, {
      extractValue: true,
    }) as string;
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
    const datasetId = this.getNodeParameter("datasetId", i, undefined, {
      extractValue: true,
    }) as string;
    qs.startTime = this.getNodeParameter("startTime", i) as string;
    qs.endTime = this.getNodeParameter("endTime", i) as string;
    Object.assign(
      qs,
      this.getNodeParameter("additionalOptions", i, {}) as IDataObject,
    );
    return { endpoint: `/datasets/${datasetId}/data`, qs };
  }
  if (operation === "getLatestData") {
    const datasetId = this.getNodeParameter("datasetId", i, undefined, {
      extractValue: true,
    }) as string;
    return { endpoint: `/datasets/${datasetId}/data/latest`, qs };
  }
  if (operation === "getFile") {
    const datasetId = this.getNodeParameter("datasetId", i, undefined, {
      extractValue: true,
    }) as string;
    const fileId = this.getNodeParameter("fileId", i) as string;
    return { endpoint: `/datasets/${datasetId}/files/${fileId}`, qs };
  }
  if (operation === "getFileData") {
    const datasetId = this.getNodeParameter("datasetId", i, undefined, {
      extractValue: true,
    }) as string;
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
    `The dataset operation "${operation}" is not recognized.`,
    {
      itemIndex: i,
      message: `The dataset 'Operation' "${operation}" is not recognized.`,
      description:
        "Select a valid 'Operation' from the dropdown menu to continue.",
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

  if (operation === "getMany") {
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
    `The data operation "${operation}" is not recognized.`,
    {
      itemIndex: i,
      message: `The data 'Operation' "${operation}" is not recognized.`,
      description:
        "Select a valid 'Operation' from the dropdown menu to continue.",
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
    `The system operation "${operation}" is not recognized.`,
    {
      itemIndex: i,
      message: `The system 'Operation' "${operation}" is not recognized.`,
      description:
        "Select a valid 'Operation' from the dropdown menu to continue.",
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
    `The 'Resource' "${resource}" is not recognized.`,
    {
      itemIndex: i,
      description:
        "Select a valid 'Resource' (Dataset, Data, or System) from the dropdown menu to continue.",
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
  const pageSize = (qs.pageSize as number) || 250;

  const collected: IDataObject[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    await respectRateLimit();

    const pageQs: IDataObject = { ...qs, page, pageSize };
    const response = await requestWithRateLimitHandling.call(
      this,
      {
        method: "GET",
        url: `${BASE_URL}${endpoint}`,
        qs: pageQs,
        json: true,
      },
      i,
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
  i: number,
): Promise<IDataObject[]> {
  const responseData = await requestWithRateLimitHandling.call(
    this,
    {
      method: "GET",
      url: `${BASE_URL}${endpoint}`,
      qs,
      json: true,
    },
    i,
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
