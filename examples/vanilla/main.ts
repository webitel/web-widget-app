import { createClient } from '@webitel/web-widget-core';
import { startMockServer } from '../../mocks/browser';
import { MOCK_BASE_URL } from '../../mocks/handlers';
import { type DebugChatElement, defineDebugChat } from './debug-chat';

await startMockServer();

const client = createClient({
	baseUrl: MOCK_BASE_URL,
	channelId: 'fake-widget',
	auth: {
		issuer: 'https://fake.webitel.local',
	},
});

client.on('error', (error) => console.error(error.code, error));
client.on('unknown', (event) => console.warn('unknown event', event));
void client.variables.set({
	language: 'uk',
});

defineDebugChat();
const chat = document.querySelector<DebugChatElement>('#chat');
if (chat) chat.client = client;

client.connect().catch((error) => console.error(error));
