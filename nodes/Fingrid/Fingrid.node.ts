import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  ILoadOptionsFunctions,
  INodeListSearchResult,
} from "n8n-workflow";

import {
  buildRequestParams,
  fetchPaginated,
  fetchSingle,
  PAGINATED_OPERATIONS,
} from "./GenericFunctions";

export class Fingrid implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Fingrid",
    name: "fingrid",
    icon: "file:fingrid.svg",
    group: ["transform"],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description:
      "Read Finnish power grid and electricity market data from Fingrid Open Data",
    defaults: {
      name: "Fingrid",
    },
    inputs: ["main"],
    outputs: ["main"],
    credentials: [
      {
        name: "fingridApi",
        required: true,
      },
    ],
    properties: [
      // ----------------------------------
      //         Resource
      // ----------------------------------
      {
        displayName: "Resource",
        name: "resource",
        type: "options",
        noDataExpression: true,
        options: [
          { name: "Dataset", value: "dataset" },
          { name: "Data (Multiple Datasets)", value: "data" },
          { name: "System", value: "system" },
        ],
        default: "dataset",
      },

      // ----------------------------------
      //         Dataset operations
      // ----------------------------------
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["dataset"] } },
        options: [
          {
            name: "Get",
            value: "get",
            description: "Get metadata for single dataset",
            action: "Get dataset",
          },
          {
            name: "Get Data",
            value: "getData",
            description: "Get time series data for dataset within a time range",
            action: "Get dataset data",
          },
          {
            name: "Get File",
            value: "getFile",
            description: "Get single dataset file",
            action: "Get dataset file",
          },
          {
            name: "Get File Data",
            value: "getFileData",
            description: "Get file-based data for dataset within a time range",
            action: "Get dataset file data",
          },
          {
            name: "Get Latest Data",
            value: "getLatestData",
            description: "Get the most recent data point for dataset",
            action: "Get latest dataset data",
          },
          {
            name: "Search",
            value: "search",
            description: "Search / list all public datasets",
            action: "Search datasets",
          },
        ],
        default: "get",
      },

      // ----------------------------------
      //         System operations
      // ----------------------------------
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["system"] } },
        options: [
          {
            name: "Get Active Notifications",
            value: "getActiveNotifications",
            description: "Get currently active service notifications",
            action: "Get active system notifications",
          },
          {
            name: "Get Health Status",
            value: "getHealthStatus",
            description: "Get the health status of Fingrid Open Data services",
            action: "Get system health status",
          },
        ],
        default: "getHealthStatus",
      },

      // ----------------------------------------
      //         Data (multi-dataset) operations
      // ----------------------------------------
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["data"] } },
        options: [
          {
            name: "Get Many",
            value: "getMany",
            description: "Get time series data for several datasets at once",
            action: "Get data for many datasets",
          },
          {
            name: "Get Recently Updated",
            value: "getUpdated",
            description:
              "Get data for datasets that changed within a recent period",
            action: "Get recently updated data",
          },
        ],
        default: "getMany",
      },

      // ----------------------------------
      //         Shared: Dataset ID
      // ----------------------------------
      {
        displayName: "Dataset ID",
        name: "datasetId",
        type: "resourceLocator",
        default: { mode: "list", value: "" },
        required: true,
        modes: [
          {
            displayName: "From List",
            name: "list",
            type: "list",
            placeholder: "Select a Dataset...",
            typeOptions: {
              searchListMethod: "searchDatasets",
              searchable: true,
            },
          },
          {
            displayName: "By ID",
            name: "id",
            type: "string",
            placeholder: "e.g. 74",
          },
        ],
        displayOptions: {
          show: {
            resource: ["dataset"],
            operation: [
              "get",
              "getData",
              "getLatestData",
              "getFile",
              "getFileData",
            ],
          },
        },
        description:
          "The numeric ID of the Fingrid dataset (find it via the 'Search' operation, or in the dataset URL on data.fingrid.fi)",
      },

      // ----------------------------------
      //         Dataset: Search
      // ----------------------------------
      {
        displayName: "Search Text",
        name: "search",
        type: "string",
        placeholder: "e.g. windPower",
        default: "",
        displayOptions: {
          show: { resource: ["dataset"], operation: ["search"] },
        },
        description:
          "Free-text search across dataset names and descriptions. Leave empty to list all datasets.",
      },
      {
        displayName: "Order By",
        name: "orderBy",
        type: "string",
        default: "id",
        placeholder: "e.g. ID",
        displayOptions: {
          show: { resource: ["dataset"], operation: ["search"] },
        },
        description: "Field to sort results by when no 'Search Text' is given",
      },

      // ----------------------------------
      //         Dataset: Get File
      // ----------------------------------
      {
        displayName: "File ID",
        name: "fileId",
        type: "string",
        placeholder: "e.g. 12345",
        default: "",
        required: true,
        displayOptions: {
          show: { resource: ["dataset"], operation: ["getFile"] },
        },
        description: "The unique identifier of the file to retrieve",
      },

      // ----------------------------------
      //         Shared: time range (startTime / endTime)
      // ----------------------------------
      {
        displayName: "Start Time",
        name: "startTime",
        type: "dateTime",
        default: "",
        required: true,
        displayOptions: {
          show: {
            operation: ["getData", "getFileData", "getMany"],
          },
        },
        description: "Start of the time range to fetch, in ISO 8601 format",
      },
      {
        displayName: "End Time",
        name: "endTime",
        type: "dateTime",
        default: "",
        required: true,
        displayOptions: {
          show: {
            operation: ["getData", "getFileData", "getMany"],
          },
        },
        description: "End of the time range to fetch, in ISO 8601 format",
      },

      // ----------------------------------
      //         Data: dataset list (multi)
      // ----------------------------------
      {
        displayName: "Dataset IDs",
        name: "datasets",
        type: "string",
        placeholder: "e.g. 74,75,192",
        default: "",
        required: true,
        displayOptions: {
          show: {
            resource: ["data"],
            operation: ["getMany", "getUpdated"],
          },
        },
        description: "Comma-separated list of dataset IDs, e.g. 74,75,192",
      },
      {
        displayName: "Days",
        name: "days",
        type: "number",
        default: 14,
        displayOptions: {
          show: { resource: ["data"], operation: ["getUpdated"] },
        },
        description: "How many days back to check for updated data",
      },

      // ----------------------------------
      //         Shared: pagination
      // ----------------------------------
      {
        displayName: "Return All",
        name: "returnAll",
        type: "boolean",
        default: false,
        displayOptions: {
          show: {
            operation: [
              "search",
              "getData",
              "getFileData",
              "getMany",
              "getUpdated",
            ],
          },
        },
        description:
          "Whether to return all results or only up to a given limit",
      },
      {
        displayName: "Limit",
        name: "limit",
        type: "number",
        typeOptions: { minValue: 1 },
        default: 50,
        displayOptions: {
          show: {
            operation: [
              "search",
              "getData",
              "getFileData",
              "getMany",
              "getUpdated",
            ],
            returnAll: [false],
          },
        },
        description: "Max number of results to return",
      },
      {
        displayName: "Simplify",
        name: "simplify",
        type: "boolean",
        default: true,
        displayOptions: {
          show: {
            operation: [
              "search",
              "getData",
              "getFileData",
              "getMany",
              "getUpdated",
            ],
          },
        },
        description:
          "Whether to return a streamlined version of the data without heavy metadata",
      },

      // ----------------------------------
      //         Shared: additional options / sorting
      // ----------------------------------
      {
        displayName: "Additional Options",
        name: "additionalOptions",
        type: "collection",
        placeholder: "Add Option",
        default: {},
        displayOptions: {
          show: {
            operation: [
              "search",
              "getData",
              "getFileData",
              "getMany",
              "getUpdated",
            ],
          },
        },
        options: [
          {
            displayName: "Page Size",
            name: "pageSize",
            type: "number",
            default: 20000,
            description:
              "Rows to request per page from the API when 'Return All' is on. Fingrid's own client defaults range from 250 to 20000 depending on endpoint.",
          },
          {
            displayName: "Sort By",
            name: "sortBy",
            type: "string",
            placeholder: "e.g. startTime",
            default: "startTime",
            description: "Field to sort the returned rows by",
          },
          {
            displayName: "Sort Order",
            name: "sortOrder",
            type: "options",
            options: [
              { name: "Ascending", value: "asc" },
              { name: "Descending", value: "desc" },
            ],
            default: "asc",
            description: "Direction to sort the results",
          },
        ],
      },
    ],
  };
  methods = {
    listSearch: {
      async searchDatasets(
        this: ILoadOptionsFunctions,
        filter?: string,
      ): Promise<INodeListSearchResult> {
        const qs: IDataObject = { pageSize: 50 };

        if (filter) {
          qs.search = filter;
        }

        const responseData =
          await this.helpers.httpRequestWithAuthentication.call(
            this,
            "fingridApi",
            {
              method: "GET",
              url: "https://data.fingrid.fi/api/datasets",
              qs,
              json: true,
            },
          );

        const datasets = Array.isArray(responseData.data)
          ? (responseData.data as Array<{
              nameEn?: string;
              nameFi?: string;
              id: number;
            }>)
          : [];

        return {
          results: datasets.map((dataset) => ({
            name: dataset.nameEn || dataset.nameFi || `Dataset ${dataset.id}`,
            value: dataset.id,
          })),
        };
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const resource = this.getNodeParameter("resource", 0) as string;
    const operation = this.getNodeParameter("operation", 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        const { endpoint, qs } = buildRequestParams.call(
          this,
          resource,
          operation,
          i,
        );

        let results = PAGINATED_OPERATIONS.includes(operation)
          ? await fetchPaginated.call(this, endpoint, qs, i)
          : await fetchSingle.call(this, endpoint, qs, i);

        const simplify = this.getNodeParameter("simplify", i, true) as boolean;

        if (simplify) {
          results = results.map((item: IDataObject) => {
            return {
              value: item.value,
              startTime: item.startTime,
              endTime: item.endTime,
              datasetId: item.datasetId,
            };
          });
        }

        returnData.push(
          ...results.map((item) => ({
            json: item,
            pairedItem: { item: i },
          })),
        );
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: (error as Error).message },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
