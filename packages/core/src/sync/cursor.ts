import type { KeyValueStorage } from '../types/storage';

const KEY = 'updates-cursor';

export interface Cursor {
	get(): string | undefined;
	save(value: string | undefined): void;
}

export function createCursor(storage: KeyValueStorage): Cursor {
	return {
		get: () => storage.get(KEY) ?? undefined,
		save(value) {
			if (value) storage.set(KEY, value);
		},
	};
}
