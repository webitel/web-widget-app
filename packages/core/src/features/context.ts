import type { Emitter } from '../shared/emitter';
import type { Store } from '../store/create-store';
import type { Cursor } from '../sync/cursor';
import type { HttpClient } from '../transport/http';
import type { Socket } from '../transport/socket';
import type { ChatState } from '../types/chat';
import type { ClientEvents, ClientOptions, Variables } from '../types/client';
import type { ServerEnvelope } from '../wire/events';
import type { Identity } from '../wire/identity';

export interface Session {
	self: Identity | undefined;
	variables: Variables;
}

export interface FeatureContext {
	options: ClientOptions;
	http: HttpClient;
	socket: Socket;
	store: Store<ChatState>;
	events: Emitter<{
		envelope: ServerEnvelope;
	}>;
	emitter: Emitter<ClientEvents>;
	cursor: Cursor;
	session: Session;
}
