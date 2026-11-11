import type { RetryPolicy, RetryScheduler } from './types';

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
	initialDelay: 1_000,
	maxDelay: 30_000,
};

export function createRetryScheduler(
	policy: RetryPolicy,
	onRetry: () => void,
): RetryScheduler {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let delay = policy.initialDelay;

	const cancel = () => {
		if (timer) clearTimeout(timer);
		timer = null;
	};

	const restart = () => {
		delay = policy.initialDelay;
	};

	return {
		get isPending() {
			return timer !== null;
		},
		schedule() {
			if (timer) return;
			// jitter: widgets on many sites must not reconnect at the same moment
			const wait = delay / 2 + (Math.random() * delay) / 2;
			timer = setTimeout(() => {
				timer = null;
				onRetry();
			}, wait);
			delay = Math.min(delay * 2, policy.maxDelay);
		},
		runNow() {
			cancel();
			restart();
			onRetry();
		},
		cancel,
		restart,
	};
}
