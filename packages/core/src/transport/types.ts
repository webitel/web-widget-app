import type { WidgetError } from '../shared/errors';
import type { CaptchaOptions } from '../types/auth';
import type { ConnectionState } from '../types/client';
import type { ServerEnvelope, ServerEvent } from '../wire/types';

export interface TokenProvider {
	getToken(): Promise<string>;
	invalidate(): void;
}

export interface SocketOptions {
	baseUrl: string;
	token: TokenProvider;
	decode: (data: unknown) => ServerEnvelope;
	onEnvelope: (envelope: ServerEnvelope) => void;
	onStateChange: (state: ConnectionState) => void;
	onError: (error: WidgetError) => void;
}

export interface Socket {
	connect(): Promise<void>;
	disconnect(): void;
	restart(): void;
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
	anonymous?: boolean;
}

export interface HttpUploadRequest {
	path: string;
	body: FormData | Blob;
	signal?: AbortSignal;
	onProgress?: (progress: UploadProgress) => void;
}

export interface HttpClientOptions {
	baseUrl: string;
	token: TokenProvider;
	captcha?: CaptchaOptions;
	tokenHeader?: string;
}

export interface HttpClient {
	request(request: HttpRequest): Promise<unknown>;
	upload(request: HttpUploadRequest): Promise<unknown>;
}
