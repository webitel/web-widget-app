import { statusError, WidgetError } from '../shared/errors';
import { parseBody } from '../shared/parse-body';
import type {
	HttpClient,
	HttpClientOptions,
	HttpRequest,
	Query,
} from './types';
import { upload } from './upload';

export function createHttpClient(options: HttpClientOptions): HttpClient {
	const baseUrl = options.baseUrl.replace(/\/+$/, '');
	const tokenHeader = options.tokenHeader ?? 'X-Webitel-Access';

	const buildUrl = (path: string, query: Query = {}) => {
		const search = new URLSearchParams();
		for (const [key, value] of Object.entries(query)) {
			if (value !== undefined) search.set(key, String(value));
		}
		const qs = search.toString();
		return `${baseUrl}/${path.replace(/^\/+/, '')}${qs ? `?${qs}` : ''}`;
	};

	const buildHeaders = async (path: string, anonymous = false) => {
		const headers: Record<string, string> = {};

		if (!anonymous) {
			try {
				headers[tokenHeader] = await options.token.getToken();
			} catch (cause) {
				throw new WidgetError('auth', 'Failed to get access token', {
					cause,
				});
			}
		}

		if (options.captcha) {
			try {
				headers[options.captcha.header] =
					await options.captcha.provider.getToken(captchaAction(path));
			} catch (cause) {
				throw new WidgetError('captcha', 'Failed to get captcha token', {
					cause,
				});
			}
		}

		return headers;
	};

	const send = async (request: HttpRequest) => {
		const headers = await buildHeaders(request.path, request.anonymous);
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
				headers: await buildHeaders(request.path),
			});
		},
	};
}

// 'v1/messages/<id>/revisions' -> 'messages_revisions'
function captchaAction(path: string): string {
	const words = path
		.split('/')
		.filter((segment) => segment !== 'v1')
		.filter((segment) => /^[a-z_]+$/i.test(segment));
	return words.join('_') || 'request';
}
