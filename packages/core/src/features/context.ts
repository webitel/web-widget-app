import type { Api } from '../api';
import type { Session } from '../session';
import type { Emitter } from '../shared/emitter';
import type { Store } from '../store/create-store';
import type { Cursor } from '../sync/cursor';
import type { ChatState } from '../types/chat';
import type { ClientEvents } from '../types/client';
import type { ServerEvents } from '../wire/events';

export interface FeatureContext {
	api: Api;
	store: Store<ChatState>;
	events: Emitter<ServerEvents>;
	emitter: Emitter<ClientEvents>;
	report(error: unknown): void;
	cursor: Cursor;
	session: Session;
}
