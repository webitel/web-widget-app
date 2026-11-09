import { createEmitter } from './shared/emitter';
import { createStorage } from './shared/storage';
import type {
	ClientEvents,
	ClientOptions,
	ConnectionState,
	Variables,
	WebWidgetClient,
} from './types/client';

export function createClient(options: ClientOptions): WebWidgetClient {
	const emitter = createEmitter<ClientEvents>();
	const storage = options.storage ?? createStorage();
	let connectionState: ConnectionState = 'idle';
	let variables: Variables = {};

	const setConnectionState = (next: ConnectionState) => {
		if (next === connectionState) return;
		connectionState = next;
		emitter.emit('connection', next);
	};

	const disconnect = () => {
		if (connectionState === 'idle') return;
		setConnectionState('disconnected');
	};

	return {
		get connectionState() {
			return connectionState;
		},
		async connect() {
			throw new Error('connect() is not implemented yet');
		},
		disconnect,
		reset() {
			disconnect();
			storage.clear();
			variables = {};
			setConnectionState('idle');
			emitter.emit('reset', undefined);
		},
		setVariables(next) {
			variables = {
				...variables,
				...next,
			};
		},
		getVariables() {
			return {
				...variables,
			};
		},
		on: emitter.on,
	};
}
