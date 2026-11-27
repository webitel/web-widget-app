import type {
	ChatState,
	ClientEvents,
	ConnectionState,
	Message,
	WebWidgetClient,
} from '@webitel/web-widget-core';
import { describe, expect, it } from 'vitest';
import { effectScope, nextTick, shallowRef } from 'vue';
import { createWidgetClientState } from './widget-client';

const EMPTY_CHAT: ChatState = {
	messages: [],
	threadId: undefined,
	readUpToSeq: 0,
	hasOlder: false,
};

const createMessage = (
	seq: number,
	author: Message['author'] = 'operator',
): Message => ({
	id: `message-${seq}`,
	sendId: undefined,
	threadId: 'thread',
	seq,
	type: 'text',
	author,
	senderName: undefined,
	text: `text ${seq}`,
	images: [],
	files: [],
	location: undefined,
	contact: undefined,
	replyTo: undefined,
	buttons: undefined,
	createdAt: seq,
	editedAt: undefined,
	deletedAt: undefined,
	version: 1,
	status: 'delivered',
	reactions: [],
	system: undefined,
	raw: undefined,
});

// [Claude] Only the store and the `connection` event of the real client, which is all the composable reads.
const createFakeClient = () => {
	let chat = EMPTY_CHAT;
	let connectionState: ConnectionState = 'idle';
	const listeners = new Set<() => void>();
	const connectionHandlers = new Set<(state: ConnectionState) => void>();

	const client = {
		get connectionState() {
			return connectionState;
		},
		getSnapshot: () => chat,
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		on<K extends keyof ClientEvents>(
			event: K,
			handler: (payload: ClientEvents[K]) => void,
		) {
			if (event !== 'connection') {
				return () => {};
			}
			const connectionHandler = handler as (state: ConnectionState) => void;
			connectionHandlers.add(connectionHandler);
			return () => {
				connectionHandlers.delete(connectionHandler);
			};
		},
	} as unknown as WebWidgetClient;

	return {
		client,
		setChat(next: ChatState) {
			chat = next;
			for (const listener of listeners) {
				listener();
			}
		},
		setConnection(next: ConnectionState) {
			connectionState = next;
			for (const handler of connectionHandlers) {
				handler(next);
			}
		},
		subscriptionCount: () => listeners.size + connectionHandlers.size,
	};
};

describe('createWidgetClientState', () => {
	it('mirrors the chat and the connection state of the client', () => {
		const fake = createFakeClient();
		const scope = effectScope();
		const state = scope.run(() =>
			createWidgetClientState(shallowRef(fake.client)),
		);

		fake.setConnection('connected');
		fake.setChat({
			...EMPTY_CHAT,
			messages: [
				createMessage(1),
			],
		});

		expect(state?.connectionState.value).toBe('connected');
		expect(state?.chat.value.messages).toHaveLength(1);
		scope.stop();
	});

	it('counts unread messages from the operator side only', () => {
		const fake = createFakeClient();
		const scope = effectScope();
		const state = scope.run(() =>
			createWidgetClientState(shallowRef(fake.client)),
		);

		fake.setChat({
			...EMPTY_CHAT,
			readUpToSeq: 1,
			messages: [
				createMessage(1),
				createMessage(2),
				createMessage(3, 'bot'),
				createMessage(4, 'client'),
			],
		});

		expect(state?.unreadCount.value).toBe(2);
		scope.stop();
	});

	it('follows a swapped client and drops the old one', async () => {
		const first = createFakeClient();
		const second = createFakeClient();
		const client = shallowRef<WebWidgetClient | null>(first.client);
		const scope = effectScope();
		const state = scope.run(() => createWidgetClientState(client));

		client.value = second.client;
		await nextTick();
		second.setConnection('reconnecting');

		expect(first.subscriptionCount()).toBe(0);
		expect(second.subscriptionCount()).toBe(2);
		expect(state?.connectionState.value).toBe('reconnecting');
		scope.stop();
	});

	it('falls back to an idle empty chat without a client', async () => {
		const fake = createFakeClient();
		const client = shallowRef<WebWidgetClient | null>(fake.client);
		const scope = effectScope();
		const state = scope.run(() => createWidgetClientState(client));
		fake.setConnection('connected');

		client.value = null;
		await nextTick();

		expect(state?.connectionState.value).toBe('idle');
		expect(state?.chat.value).toEqual(EMPTY_CHAT);
		scope.stop();
	});

	it('unsubscribes when the widget is removed', () => {
		const fake = createFakeClient();
		const scope = effectScope();
		scope.run(() => createWidgetClientState(shallowRef(fake.client)));

		scope.stop();

		expect(fake.subscriptionCount()).toBe(0);
	});
});
