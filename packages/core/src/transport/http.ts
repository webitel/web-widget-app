import { statusError, tokenError, WidgetError } from '../shared/errors';
import { parseBody } from '../shared/parse-body';
import type {
	HttpClient,
	HttpClientOptions,
	HttpRequest,
	Query,
} from './types';
import { upload } from './upload';

const CAPTCHA_ACTION = 'login';

interface HeaderOptions {
	anonymous?: boolean | undefined;
	captcha?: boolean | undefined;
}

export function createHttpClient(options: HttpClientOptions): HttpClient {
	const baseUrl = options.baseUrl.replace(/\/+$/, '');
	const tokenHeader = options.tokenHeader ?? 'X-Webitel-Access';
	const captchaHeader = options.captcha?.header ?? 'X-Webitel-Captcha';

	const buildUrl = (path: string, query: Query = {}) => {
		const search = new URLSearchParams();
		for (const [key, value] of Object.entries(query)) {
			if (value !== undefined) search.set(key, String(value));
		}
		const qs = search.toString();
		return `${baseUrl}/${path.replace(/^\/+/, '')}${qs ? `?${qs}` : ''}`;
	};

	const buildHeaders = async ({ anonymous, captcha }: HeaderOptions) => {
		const headers: Record<string, string> = {
			'X-Webitel-Client': options.clientId,
			'X-Webitel-Device': options.deviceId(),
		};

		if (!anonymous) {
			try {
				headers[tokenHeader] = await options.token.getToken();
			} catch (cause) {
				throw tokenError(cause);
			}
		}

		if (captcha && options.captcha) {
			try {
				headers[captchaHeader] =
					await options.captcha.provider.getToken(CAPTCHA_ACTION);
			} catch (cause) {
				throw new WidgetError('captcha', 'Failed to get captcha token', {
					cause,
				});
			}
		}

		return headers;
	};

	const send = async (request: HttpRequest) => {
		const headers = await buildHeaders(request);
		let body: BodyInit | null = null;

		if (request.body instanceof FormData || request.body instanceof Blob) {
			body = request.body;
		} else if (request.body !== undefined) {
			headers['Content-Type'] = 'application/json';
			body = JSON.stringify(request.body);
		}

		try {
			return await fetch(buildUrl(request.path, request.query), {
				method: request.method ?? 'GET',
				headers,
				body,
				signal: request.signal ?? null,
			});
		} catch (cause) {
			if (request.signal?.aborted) throw cause;
			throw new WidgetError('network', 'Network request failed', {
				cause,
			});
		}
	};

	return {
		async request(request) {
			let response = await send(request);
			if (response.status === 401 && !request.anonymous) {
				options.token.invalidate();
				response = await send(request);
			}

			const details = parseBody(await response.text());
			if (!response.ok) throw statusError(response.status, details, 'unknown');
			return details;
		},
		async upload(request) {
			return upload({
				...request,
				url: buildUrl(request.path),
				headers: await buildHeaders({}),
			});
		},
	};
}
