import { createApi } from './api';
import { createTokenSource } from './auth';
import { createHistoryFeature } from './features/history';
import { createInteractiveFeature } from './features/interactive';
import { subscribeMemberEvents } from './features/members';
import { createMessagesFeature } from './features/messages';
import { createReactionsFeature } from './features/reactions';
import { createReceiptsFeature } from './features/receipts';
import type { FeatureContext } from './features/types';
import { createTypingFeature } from './features/typing';
import { createVariablesFeature } from './features/variables';
import { createSession } from './session';
import { createEmitter } from './shared/emitter';
import { toWidgetError } from './shared/errors';
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
import { decodeServerEnvelope } from './wire/events';
import type { ServerEvents } from './wire/types';

export function createClient(options: ClientOptions): WebWidgetClient {
	const emitter = createEmitter<ClientEvents>();
	const events = createEmitter<ServerEvents>();
	const storage = options.storage ?? createStorage();
	const cursor = createCursor(storage);
	const store = createStore(initialChatState);
	const session = createSession(() => api.auth.me());
	let connectionState: ConnectionState = 'idle';

	const setConnectionState = (next: ConnectionState) => {
		if (next === connectionState) return;
		connectionState = next;
		emitter.emit('connection', next);
	};

	const tokens = createTokenSource({
		auth: options.auth,
		storage,
		issue: (grant) => api.auth.token(grant),
		onRefresh: () => socket.restart(),
	});

	const socket = createSocket({
		baseUrl: options.baseUrl,
		token: tokens,
		decode: (data) => decodeServerEnvelope(data, session.self),
		onEnvelope({ updatesCursor, event }) {
			cursor.save(updatesCursor);
			events.emit(event.type, event);
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

	const api = createApi({
		http: createHttpClient({
			baseUrl: options.baseUrl,
			token: tokens,
			...(options.captcha && {
				captcha: options.captcha,
			}),
		}),
		socket,
		session,
		clientId: options.channelId,
	});

	const ctx: FeatureContext = {
		api,
		store,
		events,
		emitter,
		report: (error) => emitter.emit('error', toWidgetError(error)),
		cursor,
		session,
	};

	const history = createHistoryFeature(ctx);
	const sync = createSync(ctx, history);
	const messages = createMessagesFeature(ctx);
	const receipts = createReceiptsFeature(ctx);
	const variables = createVariablesFeature(ctx);
	const reactions = createReactionsFeature(ctx);
	const typing = createTypingFeature(ctx);
	const interactive = createInteractiveFeature(ctx);
	subscribeMemberEvents(ctx);

	return {
		get connectionState() {
			return connectionState;
		},
		messages: {
			...messages,
			loadOlder: history.loadOlder,
			markRead: receipts.markRead,
		},
		variables,
		reactions,
		typing,
		interactive,
		async connect() {
			await socket.connect();
			await sync.load();
		},
		disconnect() {
			socket.disconnect();
			tokens.stop();
		},
		reset() {
			socket.disconnect();
			tokens.reset();
			storage.clear();
			sync.reset();
			session.reset();
			store.setState(() => initialChatState);
			setConnectionState('idle');
			emitter.emit('reset', undefined);
		},
		getSnapshot: store.getSnapshot,
		subscribe: store.subscribe,
		on: emitter.on,
	};
}
