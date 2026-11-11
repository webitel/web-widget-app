import type { Api } from '../api/types';
import type { Session } from '../session/types';
import type { Emitter } from '../shared/types';
import type { Store } from '../store/types';
import type { Cursor } from '../sync/types';
import type { ChatState } from '../types/chat';
import type { ClientEvents, MessagesApi } from '../types/client';
import type { ServerEvents } from '../wire/types';

export interface FeatureContext {
	api: Api;
	store: Store<ChatState>;
	events: Emitter<ServerEvents>;
	emitter: Emitter<ClientEvents>;
	report(error: unknown): void;
	cursor: Cursor;
	session: Session;
}

export type MessagesFeature = Pick<
	MessagesApi,
	| 'send'
	| 'sendLocation'
	| 'sendContact'
	| 'retry'
	| 'edit'
	| 'delete'
	| 'revisions'
>;

export interface HistoryFeature {
	loadLatest(): Promise<void>;
	loadOlder(): Promise<void>;
}

export interface ReceiptsFeature {
	markRead(): void;
}
