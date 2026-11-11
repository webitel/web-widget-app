import type { TypingApi } from '../../types/client';
import { isSameIdentity } from '../../wire/identity';
import type { FeatureContext } from '../context';

const NOTIFY_INTERVAL = 3000;

export function createTypingFeature(ctx: FeatureContext): TypingApi {
	const { http, store, session } = ctx;
	let lastSentAt = 0;

	ctx.events.on('envelope', ({ event }) => {
		if (event.type !== 'typing' || isSameIdentity(event.from, session.self)) {
			return;
		}
		ctx.emitter.emit('typing', {
			name: event.name,
			timeoutMs: event.timeoutMs,
		});
	});

	return {
		notify() {
			const { threadId } = store.getSnapshot();
			const now = Date.now();
			if (!threadId || now - lastSentAt < NOTIFY_INTERVAL) return;
			lastSentAt = now;

			http
				.request({
					method: 'POST',
					path: `v1/threads/${threadId}/typing`,
					body: {},
				})
				.catch(() => {
					lastSentAt = 0;
				});
		},
	};
}
