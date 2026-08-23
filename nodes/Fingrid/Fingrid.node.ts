import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

const BASE_URL = 'https://data.fingrid.fi/api';

export class Fingrid implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fingrid',
		name: 'fingrid',
		icon: 'file:fingrid.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Read Finnish power grid and electricity market data from Fingrid Open Data',
		defaults: {
			name: 'Fingrid',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'fingridApi',
				required: true,
			},
		],
		properties: [
			// ----------------------------------
			//         Resource
			// ----------------------------------
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Dataset', value: 'dataset' },
					{ name: 'Data (Multiple Datasets)', value: 'data' },
					{ name: 'System', value: 'system' },
				],
				default: 'dataset',
			},

			// ----------------------------------
			//         Dataset operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['dataset'] } },
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get metadata for a single dataset',
						action: 'Get a dataset',
					},
					{
						name: 'Search',
						value: 'search',
						description: 'Search / list all public datasets',
						action: 'Search datasets',
					},
					{
						name: 'Get Data',
						value: 'getData',
						description: 'Get time series data for a dataset within a time range',
						action: 'Get dataset data',
					},
					{
						name: 'Get Latest Data',
						value: 'getLatestData',
						description: 'Get the most recent data point for a dataset',
						action: 'Get latest dataset data',
					},
					{
						name: 'Get File',
						value: 'getFile',
						description: 'Get a single dataset file',
						action: 'Get a dataset file',
					},
					{
						name: 'Get File Data',
						value: 'getFileData',
						description: 'Get file-based data for a dataset within a time range',
						action: 'Get dataset file data',
					},
				],
				default: 'get',
			},

			// ----------------------------------
			//         System operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['system'] } },
				options: [
					{
						name: 'Get Active Notifications',
						value: 'getActiveNotifications',
						description: 'Get currently active service notifications',
						action: 'Get active notifications',
					},
					{
						name: 'Get Health Status',
						value: 'getHealthStatus',
						description: 'Get the health status of Fingrid Open Data services',
						action: 'Get health status',
					},
				],
				default: 'getHealthStatus',
			},

			// ----------------------------------
			//         Data (multi-dataset) operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['data'] } },
				options: [
					{
						name: 'Get Multiple',
						value: 'getMultiple',
						description: 'Get time series data for several datasets at once',
						action: 'Get data for multiple datasets',
					},
					{
						name: 'Get Updated',
						value: 'getUpdated',
						description: 'Get data for datasets that changed within a recent period',
						action: 'Get updated data',
					},
				],
				default: 'getMultiple',
			},

			// ----------------------------------
			//         Shared: Dataset ID
			// ----------------------------------
			{
				displayName: 'Dataset ID',
				name: 'datasetId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['dataset'],
						operation: ['get', 'getData', 'getLatestData', 'getFile', 'getFileData'],
					},
				},
				description:
					'The numeric ID of the Fingrid dataset (find it via the Search operation, or in the dataset URL on data.fingrid.fi)',
			},

			// ----------------------------------
			//         Dataset: Search
			// ----------------------------------
			{
				displayName: 'Search Text',
				name: 'search',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['dataset'], operation: ['search'] } },
				description: 'Free-text search across dataset names and descriptions. Leave empty to list all datasets.',
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'string',
				default: 'id',
				displayOptions: { show: { resource: ['dataset'], operation: ['search'] } },
				description: 'Field to sort results by when no search text is given',
			},

			// ----------------------------------
			//         Dataset: Get File
			// ----------------------------------
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['dataset'], operation: ['getFile'] } },
			},

			// ----------------------------------
			//         Shared: time range (startTime / endTime)
			// ----------------------------------
			{
				displayName: 'Start Time',
				name: 'startTime',
				type: 'dateTime',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['getData', 'getFileData', 'getMultiple'],
					},
				},
				description: 'Start of the time range to fetch, in ISO 8601 format',
			},
			{
				displayName: 'End Time',
				name: 'endTime',
				type: 'dateTime',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['getData', 'getFileData', 'getMultiple'],
					},
				},
				description: 'End of the time range to fetch, in ISO 8601 format',
			},

			// ----------------------------------
			//         Data: dataset list (multi)
			// ----------------------------------
			{
				displayName: 'Dataset IDs',
				name: 'datasets',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['data'], operation: ['getMultiple', 'getUpdated'] } },
				description: 'Comma-separated list of dataset IDs, e.g. 74,75,192',
			},
			{
				displayName: 'Days',
				name: 'days',
				type: 'number',
				default: 14,
				displayOptions: { show: { resource: ['data'], operation: ['getUpdated'] } },
				description: 'How many days back to check for updated data',
			},

			// ----------------------------------
			//         Shared: pagination / sorting
			// ----------------------------------
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: [
							'search',
							'getData',
							'getFileData',
							'getMultiple',
							'getUpdated',
						],
					},
				},
				options: [
					{
						displayName: 'Page Size',
						name: 'pageSize',
						type: 'number',
						default: 20000,
						description: 'Number of rows to fetch per page (API max applies)',
					},
					{
						displayName: 'Sort By',
						name: 'sortBy',
						type: 'string',
						default: 'startTime',
						description: 'Field to sort the returned rows by',
					},
					{
						displayName: 'Sort Order',
						name: 'sortOrder',
						type: 'options',
						options: [
							{ name: 'Ascending', value: 'asc' },
							{ name: 'Descending', value: 'desc' },
						],
						default: 'asc',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let endpoint = '';
				const qs: IDataObject = {};

				if (resource === 'dataset') {
					if (operation === 'get') {
						const datasetId = this.getNodeParameter('datasetId', i) as string;
						endpoint = `/datasets/${datasetId}`;
					} else if (operation === 'search') {
						endpoint = '/datasets';
						const search = this.getNodeParameter('search', i) as string;
						const orderBy = this.getNodeParameter('orderBy', i) as string;
						if (search) qs.search = search;
						if (orderBy) qs.orderBy = orderBy;
						Object.assign(qs, this.getNodeParameter('additionalOptions', i, {}) as IDataObject);
					} else if (operation === 'getData') {
						const datasetId = this.getNodeParameter('datasetId', i) as string;
						endpoint = `/datasets/${datasetId}/data`;
						qs.startTime = this.getNodeParameter('startTime', i) as string;
						qs.endTime = this.getNodeParameter('endTime', i) as string;
						Object.assign(qs, this.getNodeParameter('additionalOptions', i, {}) as IDataObject);
					} else if (operation === 'getLatestData') {
						const datasetId = this.getNodeParameter('datasetId', i) as string;
						endpoint = `/datasets/${datasetId}/data/latest`;
					} else if (operation === 'getFile') {
						const datasetId = this.getNodeParameter('datasetId', i) as string;
						const fileId = this.getNodeParameter('fileId', i) as string;
						endpoint = `/datasets/${datasetId}/files/${fileId}`;
					} else if (operation === 'getFileData') {
						const datasetId = this.getNodeParameter('datasetId', i) as string;
						endpoint = `/datasets/${datasetId}/files`;
						qs.startTime = this.getNodeParameter('startTime', i) as string;
						qs.endTime = this.getNodeParameter('endTime', i) as string;
						Object.assign(qs, this.getNodeParameter('additionalOptions', i, {}) as IDataObject);
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown dataset operation "${operation}"`, {
							itemIndex: i,
						});
					}
				} else if (resource === 'data') {
					const datasetsRaw = this.getNodeParameter('datasets', i) as string;
					qs.datasets = datasetsRaw
						.split(',')
						.map((d) => d.trim())
						.filter((d) => d.length > 0)
						.join(',');

					if (operation === 'getMultiple') {
						endpoint = '/data';
						qs.startTime = this.getNodeParameter('startTime', i) as string;
						qs.endTime = this.getNodeParameter('endTime', i) as string;
						Object.assign(qs, this.getNodeParameter('additionalOptions', i, {}) as IDataObject);
					} else if (operation === 'getUpdated') {
						endpoint = '/data/updates';
						qs.days = this.getNodeParameter('days', i) as number;
						Object.assign(qs, this.getNodeParameter('additionalOptions', i, {}) as IDataObject);
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown data operation "${operation}"`, {
							itemIndex: i,
						});
					}
				} else if (resource === 'system') {
					if (operation === 'getActiveNotifications') {
						endpoint = '/notifications/active';
					} else if (operation === 'getHealthStatus') {
						endpoint = '/health';
					} else {
						throw new NodeOperationError(this.getNode(), `Unknown system operation "${operation}"`, {
							itemIndex: i,
						});
					}
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource "${resource}"`, {
						itemIndex: i,
					});
				}

				const responseData = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'fingridApi',
					{
						method: 'GET',
						url: `${BASE_URL}${endpoint}`,
						qs,
						json: true,
					},
				);

				if (Array.isArray(responseData)) {
					returnData.push(
						...responseData.map((item: IDataObject) => ({
							json: item,
							pairedItem: { item: i },
						})),
					);
				} else if (responseData && typeof responseData === 'object' && Array.isArray((responseData as IDataObject).data)) {
					// Paginated shape: { data: [...], pagination: {...} }
					const dataArray = (responseData as IDataObject).data as IDataObject[];
					returnData.push(
						...dataArray.map((item) => ({
							json: item,
							pairedItem: { item: i },
						})),
					);
				} else {
					returnData.push({
						json: responseData as IDataObject,
						pairedItem: { item: i },
					});
				}
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
