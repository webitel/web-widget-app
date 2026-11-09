import type { KeyValueStorage } from '../types/storage';

type StorageBackend = Pick<
	Storage,
	'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'
>;

export interface CreateStorageOptions {
	prefix?: string;
	backend?: StorageBackend | null;
}

function getLocalStorage(): StorageBackend | null {
	try {
		const storage = globalThis.localStorage;
		const probe = '__webitel_widget_probe__';
		storage.setItem(probe, probe);
		storage.removeItem(probe);
		return storage;
	} catch {
		return null;
	}
}

function createMemoryStorage(prefix: string): KeyValueStorage {
	const items = new Map<string, string>();
	return {
		get: (key) => items.get(prefix + key) ?? null,
		set: (key, value) => {
			items.set(prefix + key, value);
		},
		remove: (key) => {
			items.delete(prefix + key);
		},
		clear: () => {
			items.clear();
		},
	};
}

export function createStorage({
	prefix = 'webitel-widget:',
	backend = getLocalStorage(),
}: CreateStorageOptions = {}): KeyValueStorage {
	if (!backend) return createMemoryStorage(prefix);

	return {
		get: (key) => backend.getItem(prefix + key),
		set: (key, value) => backend.setItem(prefix + key, value),
		remove: (key) => backend.removeItem(prefix + key),
		clear: () => {
			const own: string[] = [];
			for (let i = 0; i < backend.length; i++) {
				const key = backend.key(i);
				if (key?.startsWith(prefix)) own.push(key);
			}
			for (const key of own) backend.removeItem(key);
		},
	};
}
