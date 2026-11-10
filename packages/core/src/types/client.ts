import type { WidgetError } from '../shared/errors';
import type { AuthProvider, CaptchaOptions } from './auth';
import type { ChatState } from './chat';
import type { Message } from './message';
import type { KeyValueStorage } from './storage';

export interface ClientOptions {
	baseUrl: string;
	channelId: string;
	auth: AuthProvider;
	captcha?: CaptchaOptions;
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

export interface TypingEvent {
	name: string | undefined;
	timeoutMs: number;
}

export type ClientEvents = {
	connection: ConnectionState;
	message: Message;
	typing: TypingEvent;
	unknown: UnknownEvent;
	error: WidgetError;
	reset: undefined;
};

export interface MessagesApi {
	send(text: string): Promise<void>;
	retry(id: string): Promise<void>;
	loadOlder(): Promise<void>;
	markRead(): void;
}

export interface VariablesApi {
	set(variables: Variables): Promise<void>;
	get(): Variables;
}

export interface WebWidgetClient {
	readonly connectionState: ConnectionState;
	readonly messages: MessagesApi;
	readonly variables: VariablesApi;
	connect(): Promise<void>;
	disconnect(): void;
	reset(): void;
	getSnapshot(): ChatState;
	subscribe(listener: () => void): () => void;
	on<K extends keyof ClientEvents>(
		event: K,
		handler: (payload: ClientEvents[K]) => void,
	): () => void;
}
