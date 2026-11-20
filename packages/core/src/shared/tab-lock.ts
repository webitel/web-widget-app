export type TabLock = <T>(task: () => Promise<T>) => Promise<T>;

// Runs one task at a time across all tabs of the site.
export function createTabLock(name: string): TabLock {
	return async (task) => {
		const locks = globalThis.navigator?.locks;
		if (!locks) return task();
		return await locks.request(name, task);
	};
}
