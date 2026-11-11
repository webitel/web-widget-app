import type { Emitter, Handler } from './types';

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
