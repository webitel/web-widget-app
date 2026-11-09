type Handler<T> = (payload: T) => void;

export interface Emitter<Events extends Record<string, unknown>> {
	on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void;
	emit<K extends keyof Events>(event: K, payload: Events[K]): void;
}

export function createEmitter<
	Events extends Record<string, unknown>,
>(): Emitter<Events> {
	const handlers: {
		[K in keyof Events]?: Set<Handler<Events[K]>>;
	} = {};

	return {
		on(event, handler) {
			const set = handlers[event] ?? new Set();
			handlers[event] = set;
			set.add(handler);
			return () => {
				set.delete(handler);
			};
		},
		emit(event, payload) {
			for (const handler of handlers[event] ?? []) {
				handler(payload);
			}
		},
	};
}
