import type { KeyValueStorage } from '../types/storage';

const DEVICE_KEY = 'device';

export function getDeviceId(storage: KeyValueStorage): string {
	const existing = storage.get(DEVICE_KEY);
	if (existing) return existing;
	const id = crypto.randomUUID();
	storage.set(DEVICE_KEY, id);
	return id;
}
