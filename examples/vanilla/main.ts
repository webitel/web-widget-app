import { createClient } from '@webitel/web-widget-core';
import {
	defineWebitelChat,
	type WebitelChatElement,
} from '@webitel/web-widget-ui';

const client = createClient({
	baseUrl: 'https://example.webitel.com',
	auth: {
		getToken: async () => 'token',
	},
});

client.setVariables({
	language: 'uk',
});

defineWebitelChat();
const chat = document.querySelector<WebitelChatElement>('#chat');
if (chat) chat.client = client;
