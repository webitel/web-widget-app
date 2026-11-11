import type { WidgetError } from '../shared/errors';
import type { AuthProvider, CaptchaOptions } from './auth';
import type { ChatState } from './chat';
import type {
	Message,
	MessageContact,
	MessageLocation,
	MessageRevision,
} from './message';
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

export interface SendOptions {
	replyTo?: string | undefined;
}

export interface ButtonPress {
	code: string;
	data?: string | undefined;
}

export interface MessagesApi {
	send(text: string, options?: SendOptions): Promise<void>;
	sendLocation(location: MessageLocation, options?: SendOptions): Promise<void>;
	sendContact(contact: MessageContact, options?: SendOptions): Promise<void>;
	retry(id: string): Promise<void>;
	edit(id: string, text: string): Promise<void>;
	delete(id: string): Promise<void>;
	revisions(id: string): Promise<MessageRevision[]>;
	loadOlder(): Promise<void>;
	markRead(): void;
}

export interface ReactionsApi {
	set(messageId: string, emoji: string): Promise<void>;
	clear(messageId: string): Promise<void>;
}

export interface TypingApi {
	notify(): void;
}

export interface InteractiveApi {
	press(messageId: string, button: ButtonPress): Promise<void>;
}

export interface VariablesApi {
	set(variables: Variables): Promise<void>;
	get(): Variables;
}

export interface WebWidgetClient {
	readonly connectionState: ConnectionState;
	readonly messages: MessagesApi;
	readonly variables: VariablesApi;
	readonly reactions: ReactionsApi;
	readonly typing: TypingApi;
	readonly interactive: InteractiveApi;
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
