import { describe, expect, it, vi } from 'vitest';
import type { TokenGrant } from '../api/types';
import { createStorage } from '../shared/storage';
import type { TabLock } from '../shared/tab-lock';
import type { KeyValueStorage } from '../types/storage';
import { createTokenSource } from './index';

// Same behaviour as navigator.locks inside one test: tasks run one by one.
function createTestLock(): TabLock {
	let tail: Promise<unknown> = Promise.resolve();
	return (task) => {
		const run = tail.then(task);
		tail = run.catch(() => {});
		return run;
	};
}

function createServer() {
	const grants: TokenGrant[] = [];
	const issue = vi.fn(async (grant: TokenGrant) => {
		grants.push(grant);
		await new Promise((resolve) => setTimeout(resolve, 10));
		return {
			accessToken: `access-${grants.length}`,
			refreshToken: `refresh-${grants.length}`,
			expiresIn: 3600,
		};
	});
	return {
		grants,
		issue,
	};
}

function openTab(
	storage: KeyValueStorage,
	lock: TabLock,
	issue: ReturnType<typeof createServer>['issue'],
) {
	return createTokenSource({
		auth: {
			issuer: 'https://site.example',
		},
		storage,
		lock,
		issue,
		onRefresh() {},
	});
}

describe('token source in several tabs', () => {
	it('gives two tabs opened at once one guest and one token', async () => {
		const storage = createStorage({
			backend: null,
		});
		const lock = createTestLock();
		const server = createServer();
		const first = openTab(storage, lock, server.issue);
		const second = openTab(storage, lock, server.issue);

		const tokens = await Promise.all([
			first.getToken(),
			second.getToken(),
		]);

		expect(tokens).toEqual([
			'access-1',
			'access-1',
		]);
		expect(server.issue).toHaveBeenCalledTimes(1);
		first.stop();
		second.stop();
	});

	it('takes the token another tab has just refreshed', async () => {
		const storage = createStorage({
			backend: null,
		});
		const lock = createTestLock();
		const server = createServer();
		const first = openTab(storage, lock, server.issue);
		await first.getToken();
		const second = openTab(storage, lock, server.issue);

		first.invalidate();
		expect(await first.getToken()).toBe('access-2');
		second.invalidate();
		expect(await second.getToken()).toBe('access-2');

		expect(server.issue).toHaveBeenCalledTimes(2);
		first.stop();
		second.stop();
	});

	it('does not reuse a stored token the server rejected', async () => {
		const storage = createStorage({
			backend: null,
		});
		const server = createServer();
		const tab = openTab(storage, createTestLock(), server.issue);
		await tab.getToken();

		tab.invalidate();

		expect(await tab.getToken()).toBe('access-2');
		expect(server.grants[1]).toEqual({
			refreshToken: 'refresh-1',
		});
		tab.stop();
	});
});
