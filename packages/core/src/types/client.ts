import type { WidgetError } from '../shared/errors';
import type { AuthProvider, CaptchaProvider } from './auth';
import type { Message } from './message';
import type { KeyValueStorage } from './storage';

export interface ClientOptions {
	baseUrl: string;
	auth: AuthProvider;
	captcha?: CaptchaProvider;
	storage?: KeyValueStorage;
}

export type ConnectionState =
	| 'idle'
	| 'connecting'
	| 'authenticating'
	| 'connected'
	| 'reconnecting'
	| 'disconnected';

export type Variables = Record<string, string>;

export interface UnknownEvent {
	name: string;
	payload: unknown;
}

export type ClientEvents = {
	connection: ConnectionState;
	message: Message;
	unknown: UnknownEvent;
	error: WidgetError;
	reset: undefined;
};

export interface WebWidgetClient {
	readonly connectionState: ConnectionState;
	connect(): Promise<void>;
	disconnect(): void;
	reset(): void;
	setVariables(variables: Variables): void;
	getVariables(): Variables;
	on<K extends keyof ClientEvents>(
		event: K,
		handler: (payload: ClientEvents[K]) => void,
	): () => void;
}
