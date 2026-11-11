import { lastIncomingSeq, withHorizon, withMessages } from '../../store/chat';
import { setMessageStatus } from '../../store/messages';
import { isSameIdentity } from '../../wire/identity';
import type { FeatureContext, ReceiptsFeature } from '../types';

export function createReceiptsFeature(ctx: FeatureContext): ReceiptsFeature {
	const { store, session } = ctx;

	ctx.events.on('message_status', ({ status, messageId, upToSeq, member }) => {
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

			ctx.api.threads.markRead(threadId, seq).catch(ctx.report);
		},
	};
}
