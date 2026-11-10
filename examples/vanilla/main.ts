import { createClient } from '@webitel/web-widget-core';
import {
	defineWebitelChat,
	type WebitelChatElement,
} from '@webitel/web-widget-ui';
import { startMockServer } from '../../mocks/browser';
import { MOCK_BASE_URL } from '../../mocks/handlers';

await startMockServer();

const client = createClient({
	baseUrl: MOCK_BASE_URL,
	channelId: 'fake-widget',
	auth: {
		getToken: async () => 'fake-token',
	},
});

client.on('error', (error) => console.error(error.code, error));
client.on('unknown', (event) => console.warn('unknown event', event));
void client.variables.set({
	language: 'uk',
});

defineWebitelChat();
const chat = document.querySelector<WebitelChatElement>('#chat');
if (chat) chat.client = client;

client.connect().catch((error) => console.error(error));
