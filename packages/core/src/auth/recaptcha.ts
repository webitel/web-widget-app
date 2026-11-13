import type { CaptchaProvider } from '../types/auth';

interface Recaptcha {
	ready(callback: () => void): void;
	execute(
		siteKey: string,
		options: {
			action: string;
		},
	): Promise<string>;
}

declare global {
	interface Window {
		grecaptcha?: Recaptcha;
	}
}

export function createRecaptchaProvider(siteKey: string): CaptchaProvider {
	let loading: Promise<Recaptcha> | undefined;

	const load = () => {
		loading ??= loadRecaptcha(siteKey).catch((error: unknown) => {
			loading = undefined;
			throw error;
		});
		return loading;
	};

	return {
		async getToken(action) {
			const recaptcha = await load();
			return recaptcha.execute(siteKey, {
				action,
			});
		},
	};
}

async function loadRecaptcha(siteKey: string): Promise<Recaptcha> {
	if (!window.grecaptcha) await loadScript(siteKey);

	const recaptcha = window.grecaptcha;
	if (!recaptcha) throw new Error('reCAPTCHA is not available');

	await new Promise<void>((resolve) => recaptcha.ready(resolve));
	return recaptcha;
}

function loadScript(siteKey: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
		script.async = true;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error('Failed to load reCAPTCHA'));
		document.head.append(script);
	});
}
