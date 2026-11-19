import { describe, expect, it } from 'vitest';
import { createTabChannel } from './tab-channel';

describe('tab channel', () => {
	it('tells other tabs about reset, not the tab that reset', async () => {
		const first = createTabChannel('test-reset');
		const second = createTabChannel('test-reset');
		const heard: string[] = [];
		first.onReset(() => heard.push('first'));
		const secondHeard = new Promise<void>((resolve) => {
			second.onReset(() => {
				heard.push('second');
				resolve();
			});
		});

		first.announceReset();
		await secondHeard;

		expect(heard).toEqual([
			'second',
		]);
		first.close();
		second.close();
	});
});
