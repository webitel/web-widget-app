/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_BASE_URL?: string;
	readonly VITE_SOCKET_URL?: string;
	readonly VITE_CHANNEL_ID?: string;
	readonly VITE_ISSUER?: string;
	readonly VITE_RECAPTCHA_SITE_KEY?: string;
}
