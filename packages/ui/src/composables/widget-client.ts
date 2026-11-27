import {
	type ChatState,
	type ConnectionState,
	countUnread,
	type WebWidgetClient,
} from '@webitel/web-widget-core';
import {
	type ComputedRef,
	computed,
	type InjectionKey,
	inject,
	provide,
	type Ref,
	shallowRef,
	watch,
} from 'vue';

// [Claude] Core's client state as Vue refs, shared by every component of the widget. Core owns connecting, reconnecting and reset; this only mirrors what it reports. `reset()` needs no handling here: core clears its store and notifies subscribers like any other change.
export type WidgetClientState = {
	client: Readonly<Ref<WebWidgetClient | null>>;
	connectionState: Readonly<Ref<ConnectionState>>;
	chat: Readonly<Ref<ChatState>>;
	unreadCount: ComputedRef<number>;
};

const EMPTY_CHAT: ChatState = {
	messages: [],
	threadId: undefined,
	readUpToSeq: 0,
	hasOlder: false,
};

const WIDGET_CLIENT_KEY: InjectionKey<WidgetClientState> = Symbol(
	'webitel-widget-client',
);

// [Claude] Follows the client the site sets on the element, also when it swaps it for another one or clears it. Subscriptions end with the calling scope, i.e. when the element leaves the page.
export const createWidgetClientState = (
	client: Readonly<Ref<WebWidgetClient | null>>,
): WidgetClientState => {
	// [Claude] shallowRef: core's snapshots are immutable and replaced on every change, so deep reactivity would only add proxies.
	const connectionState = shallowRef<ConnectionState>('idle');
	const chat = shallowRef<ChatState>(EMPTY_CHAT);

	watch(
		client,
		(current, _previous, onCleanup) => {
			connectionState.value = current?.connectionState ?? 'idle';
			chat.value = current?.getSnapshot() ?? EMPTY_CHAT;
			if (!current) {
				return;
			}
			const stops = [
				current.subscribe(() => {
					chat.value = current.getSnapshot();
				}),
				current.on('connection', (state) => {
					connectionState.value = state;
				}),
			];
			onCleanup(() => {
				for (const stop of stops) {
					stop();
				}
			});
		},
		{
			immediate: true,
		},
	);

	return {
		client,
		connectionState,
		chat,
		unreadCount: computed(() => countUnread(chat.value)),
	};
};

export const provideWidgetClient = (
	client: Readonly<Ref<WebWidgetClient | null>>,
): WidgetClientState => {
	const state = createWidgetClientState(client);
	provide(WIDGET_CLIENT_KEY, state);
	return state;
};

export const useWidgetClient = (): WidgetClientState => {
	const state = inject(WIDGET_CLIENT_KEY);
	if (!state) {
		throw new Error(
			'useWidgetClient() needs provideWidgetClient() in the root component',
		);
	}
	return state;
};
