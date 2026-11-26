import {
	type ClientOptions,
	createClient,
	createRecaptchaProvider,
} from '@webitel/web-widget-core';
import {
	defineWebitelChat,
	type WebitelChatElement,
} from '@webitel/web-widget-ui';
import { startMockServer } from '../../mocks/browser';
import { MOCK_BASE_URL } from '../../mocks/handlers';

const env = import.meta.env;

const mockOptions: ClientOptions = {
	baseUrl: MOCK_BASE_URL,
	channelId: 'fake-widget',
	auth: {
		issuer: 'https://fake.webitel.local',
	},
};

// Set VITE_BASE_URL in .env.local to talk to a real backend instead of the mocks.
async function getOptions(): Promise<ClientOptions> {
	if (!env.VITE_BASE_URL) {
		await startMockServer();
		return mockOptions;
	}
	const options: ClientOptions = {
		baseUrl: env.VITE_BASE_URL,
		socketUrl: env.VITE_SOCKET_URL,
		channelId: env.VITE_CHANNEL_ID ?? '',
		auth: {
			issuer: env.VITE_ISSUER ?? '',
		},
	};
	if (env.VITE_RECAPTCHA_SITE_KEY) {
		options.captcha = {
			provider: createRecaptchaProvider(env.VITE_RECAPTCHA_SITE_KEY),
		};
	}
	return options;
}

const client = createClient(await getOptions());

client.on('error', (error) => console.error(error.code, error));
client.on('unknown', (event) => console.warn('unknown event', event));
void client.variables.set({
	language: 'uk',
});

defineWebitelChat();
const chat = document.querySelector<WebitelChatElement>('#chat');
if (chat) chat.client = client;

client.connect().catch((error) => console.error(error));
