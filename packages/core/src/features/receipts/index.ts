import { toWidgetError } from '../../shared/errors';
import { lastIncomingSeq, withHorizon, withMessages } from '../../store/chat';
import { setMessageStatus } from '../../store/messages';
import { isSameIdentity } from '../../wire/identity';
import type { FeatureContext } from '../context';

export interface ReceiptsFeature {
	markRead(): void;
}

export function createReceiptsFeature(ctx: FeatureContext): ReceiptsFeature {
	const { store, session } = ctx;

	ctx.events.on('envelope', ({ event }) => {
		if (event.type !== 'message_status') return;
		const { status, messageId, upToSeq, member } = event;

		if (status === 'failed' && messageId) {
			store.setState(
				withMessages((list) => setMessageStatus(list, messageId, 'failed')),
			);
			return;
		}
		if ((status === 'delivered' || status === 'read') && upToSeq) {
			store.setState(
				withHorizon(isSameIdentity(member, session.self), status, upToSeq),
			);
		}
	});

	return {
		markRead() {
			const state = store.getSnapshot();
			const seq = lastIncomingSeq(state);
			const { threadId } = state;
			if (!threadId || seq <= state.readUpToSeq) return;

			store.setState(withHorizon(true, 'read', seq));

			ctx.api.threads.markRead(threadId, seq).catch((error: unknown) => {
				ctx.emitter.emit('error', toWidgetError(error));
			});
		},
	};
}
