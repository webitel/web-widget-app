import type { TypingApi } from '../../types/client';
import { isSameIdentity } from '../../wire/identity';
import type { FeatureContext } from '../types';

const NOTIFY_INTERVAL = 3000;

export function createTypingFeature(ctx: FeatureContext): TypingApi {
	const { api, store, session } = ctx;
	let lastSentAt = 0;

	ctx.events.on('typing', ({ from, name, timeoutMs }) => {
		if (isSameIdentity(from, session.self)) return;
		ctx.emitter.emit('typing', {
			name,
			timeoutMs,
		});
	});

	return {
		notify() {
			const { threadId } = store.getSnapshot();
			const now = Date.now();
			if (!threadId || now - lastSentAt < NOTIFY_INTERVAL) return;
			lastSentAt = now;

			api.threads.typing(threadId).catch(() => {
				lastSentAt = 0;
			});
		},
	};
}
