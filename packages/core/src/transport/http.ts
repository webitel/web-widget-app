import { statusError, WidgetError } from '../shared/errors';
import { parseBody } from '../shared/parse-body';
import type { AuthProvider, CaptchaProvider } from '../types/auth';
import { type UploadProgress, upload } from './upload';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type Query = Record<string, string | number | boolean | undefined>;

export interface HttpRequest {
	method?: HttpMethod;
	path: string;
	query?: Query;
	body?: unknown;
	signal?: AbortSignal;
	captchaAction?: string;
}

export interface HttpUploadRequest {
	path: string;
	body: FormData | Blob;
	signal?: AbortSignal;
	captchaAction?: string;
	onProgress?: (progress: UploadProgress) => void;
}

export interface HttpClientOptions {
	baseUrl: string;
	auth: AuthProvider;
	captcha?: {
		provider: CaptchaProvider;
		header: string;
	};
	tokenHeader?: string;
}

export interface HttpClient {
	request(request: HttpRequest): Promise<unknown>;
	upload(request: HttpUploadRequest): Promise<unknown>;
}

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

	const buildHeaders = async (captchaAction?: string) => {
		const headers: Record<string, string> = {};

		try {
			headers[tokenHeader] = await options.auth.getToken();
		} catch (cause) {
			throw new WidgetError('auth', 'Failed to get access token', {
				cause,
			});
		}

		if (captchaAction && options.captcha) {
			try {
				headers[options.captcha.header] =
					await options.captcha.provider.getToken(captchaAction);
			} catch (cause) {
				throw new WidgetError('captcha', 'Failed to get captcha token', {
					cause,
				});
			}
		}

		return headers;
	};

	const send = async (request: HttpRequest) => {
		const headers = await buildHeaders(request.captchaAction);
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
			if (response.status === 401) response = await send(request);

			const details = parseBody(await response.text());
			if (!response.ok) throw statusError(response.status, details, 'unknown');
			return details;
		},
		async upload(request) {
			return upload({
				...request,
				url: buildUrl(request.path),
				headers: await buildHeaders(request.captchaAction),
			});
		},
	};
}
