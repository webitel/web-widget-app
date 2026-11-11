import type { WidgetError } from '../shared/errors';
import type { AuthProvider, CaptchaOptions } from '../types/auth';
import type { ConnectionState } from '../types/client';
import type { ServerEnvelope, ServerEvent } from '../wire/types';

export interface SocketOptions {
	baseUrl: string;
	getToken: () => Promise<string>;
	decode: (data: unknown) => ServerEnvelope;
	onEnvelope: (envelope: ServerEnvelope) => void;
	onStateChange: (state: ConnectionState) => void;
	onError: (error: WidgetError) => void;
}

export interface Socket {
	connect(): Promise<void>;
	disconnect(): void;
	send(command: object): boolean;
}

export type DisconnectEvent = Extract<
	ServerEvent,
	{
		type: 'disconnected';
	}
>;

export interface UploadProgress {
	loaded: number;
	total: number | undefined;
}

export interface UploadRequest {
	url: string;
	body: FormData | Blob;
	headers: Record<string, string>;
	signal?: AbortSignal;
	onProgress?: (progress: UploadProgress) => void;
}

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
	captcha?: CaptchaOptions;
	tokenHeader?: string;
}

export interface HttpClient {
	request(request: HttpRequest): Promise<unknown>;
	upload(request: HttpUploadRequest): Promise<unknown>;
}
