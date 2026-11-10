import type { FeatureContext, Session } from './features/context';
import { createHistoryFeature } from './features/history';
import { createMessagesFeature } from './features/messages';
import { createReceiptsFeature } from './features/receipts';
import { createVariablesFeature } from './features/variables';
import { createEmitter } from './shared/emitter';
import { createStorage } from './shared/storage';
import { initialChatState } from './store/chat';
import { createStore } from './store/create-store';
import { createSync } from './sync';
import { createCursor } from './sync/cursor';
import { createHttpClient } from './transport/http';
import { createSocket } from './transport/socket';
import type {
	ClientEvents,
	ClientOptions,
	ConnectionState,
	WebWidgetClient,
} from './types/client';
import type { ServerEnvelope } from './wire/events';

export function createClient(options: ClientOptions): WebWidgetClient {
	const emitter = createEmitter<ClientEvents>();
	const events = createEmitter<{
		envelope: ServerEnvelope;
	}>();
	const storage = options.storage ?? createStorage();
	const cursor = createCursor(storage);
	const store = createStore(initialChatState);
	const session: Session = {
		self: undefined,
		variables: {},
	};
	let connectionState: ConnectionState = 'idle';

	const setConnectionState = (next: ConnectionState) => {
		if (next === connectionState) return;
		connectionState = next;
		emitter.emit('connection', next);
	};

	const socket = createSocket({
		baseUrl: options.baseUrl,
		getToken: () => options.auth.getToken(),
		onEnvelope(envelope) {
			cursor.save(envelope.updatesCursor);
			events.emit('envelope', envelope);
			const { event } = envelope;
			if (event.type === 'unknown') {
				emitter.emit('unknown', {
					name: event.name,
					payload: event.payload,
				});
			}
		},
		onStateChange: setConnectionState,
		onError: (error) => emitter.emit('error', error),
	});

	const ctx: FeatureContext = {
		options,
		http: createHttpClient(options),
		socket,
		store,
		events,
		emitter,
		cursor,
		session,
	};

	const history = createHistoryFeature(ctx);
	const sync = createSync(ctx, history);
	const messages = createMessagesFeature(ctx);
	const receipts = createReceiptsFeature(ctx);
	const variables = createVariablesFeature(ctx);

	return {
		get connectionState() {
			return connectionState;
		},
		messages: {
			send: messages.send,
			retry: messages.retry,
			loadOlder: history.loadOlder,
			markRead: receipts.markRead,
		},
		variables,
		async connect() {
			await socket.connect();
			await sync.load();
		},
		disconnect: socket.disconnect,
		reset() {
			socket.disconnect();
			storage.clear();
			sync.reset();
			session.self = undefined;
			session.variables = {};
			store.setState(() => initialChatState);
			setConnectionState('idle');
			emitter.emit('reset', undefined);
		},
		getSnapshot: store.getSnapshot,
		subscribe: store.subscribe,
		on: emitter.on,
	};
}
