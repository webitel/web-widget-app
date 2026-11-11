import type { KeyValueStorage } from '../types/storage';
import type { Cursor } from './types';

const KEY = 'updates-cursor';

export function createCursor(storage: KeyValueStorage): Cursor {
	return {
		get: () => storage.get(KEY) ?? undefined,
		save(value) {
			if (value) storage.set(KEY, value);
		},
	};
}
