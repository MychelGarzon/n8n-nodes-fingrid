"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FingridApi = void 0;
class FingridApi {
    constructor() {
        this.name = 'fingridApi';
        this.displayName = 'Fingrid API';
        this.documentationUrl = 'https://data.fingrid.fi/en/instructions';
        this.properties = [
            {
                displayName: 'API Key',
                name: 'apiKey',
                type: 'string',
                typeOptions: { password: true },
                default: '',
                required: true,
                description: 'Your personal Fingrid Open Data API key. Register for free at https://data.fingrid.fi/en to get one instantly by email.',
            },
        ];
        this.authenticate = {
            type: 'generic',
            properties: {
                headers: {
                    'x-api-key': '={{$credentials.apiKey}}',
                },
            },
        };
        this.test = {
            request: {
                baseURL: 'https://data.fingrid.fi/api',
                url: '/health',
                method: 'GET',
            },
        };
    }
}
exports.FingridApi = FingridApi;
