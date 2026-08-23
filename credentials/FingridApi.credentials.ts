import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class FingridApi implements ICredentialType {
	name = 'fingridApi';

	displayName = 'Fingrid API';

	documentationUrl = 'https://data.fingrid.fi/en/instructions';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Your personal Fingrid Open Data API key. Register for free at https://data.fingrid.fi/en to get one instantly by email.',
		},
	];

	// Fingrid's API expects the key in an "x-api-key" header, confirmed
	// directly from their own official Python client (fingrid-py) source.
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	// Cheap, harmless endpoint to validate the key: service health check.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://data.fingrid.fi/api',
			url: '/health',
			method: 'GET',
		},
	};
}
