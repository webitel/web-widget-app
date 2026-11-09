export interface Store<State> {
	getSnapshot(): State;
	setState(update: (state: State) => State): void;
	subscribe(listener: () => void): () => void;
}

export function createStore<State>(initial: State): Store<State> {
	let state = initial;
	const listeners = new Set<() => void>();

	return {
		getSnapshot: () => state,
		setState(update) {
			const next = update(state);
			if (Object.is(next, state)) return;
			state = next;
			for (const listener of listeners) listener();
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
