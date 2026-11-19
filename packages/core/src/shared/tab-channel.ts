const RESET = 'reset';

export interface TabChannel {
	announceReset(): void;
	onReset(listener: () => void): () => void;
	close(): void;
}

export function createTabChannel(name: string): TabChannel {
	if (typeof BroadcastChannel === 'undefined') {
		return {
			announceReset() {},
			onReset: () => () => {},
			close() {},
		};
	}

	const channel = new BroadcastChannel(name);
	return {
		announceReset: () => channel.postMessage(RESET),
		onReset(listener) {
			const handle = (event: MessageEvent) => {
				if (event.data === RESET) listener();
			};
			channel.addEventListener('message', handle);
			return () => channel.removeEventListener('message', handle);
		},
		close: () => channel.close(),
	};
}
