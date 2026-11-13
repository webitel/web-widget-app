export type Handler<T> = (payload: T) => void;

export interface Emitter<Events extends Record<string, unknown>> {
	on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void;
	emit<K extends keyof Events>(event: K, payload: Events[K]): void;
}

export type WidgetErrorCode =
	| 'network'
	| 'auth'
	| 'captcha'
	| 'bad_request'
	| 'forbidden'
	| 'not_found'
	| 'forbidden_file'
	| 'file_too_large'
	| 'upload_failed'
	| 'rate_limited'
	| 'server'
	| 'unknown';

export interface WidgetErrorOptions {
	status?: number;
	reason?: string | undefined;
	details?: unknown;
	cause?: unknown;
}

export type StorageBackend = Pick<
	Storage,
	'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'
>;

export interface CreateStorageOptions {
	prefix?: string;
	backend?: StorageBackend | null;
}
