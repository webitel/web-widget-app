import type { Api } from '../api';
import type { Emitter } from '../shared/emitter';
import type { Store } from '../store/create-store';
import type { Cursor } from '../sync/cursor';
import type { ChatState } from '../types/chat';
import type { ClientEvents, Variables } from '../types/client';
import type { ServerEvents } from '../wire/events';
import type { Identity } from '../wire/identity';

export interface Session {
	self: Identity | undefined;
	variables: Variables;
}

export interface FeatureContext {
	api: Api;
	store: Store<ChatState>;
	events: Emitter<ServerEvents>;
	emitter: Emitter<ClientEvents>;
	report(error: unknown): void;
	cursor: Cursor;
	session: Session;
}
