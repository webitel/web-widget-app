import { withMessages } from '../../store/chat';
import { updateMessage } from '../../store/messages';
import type { ReactionsApi } from '../../types/client';
import type { FeatureContext } from '../context';

export function createReactionsFeature(ctx: FeatureContext): ReactionsApi {
	const { api, store } = ctx;

	ctx.events.on('envelope', ({ event }) => {
		if (event.type !== 'reaction' || !event.messageId) return;
		const { messageId, reactions } = event;
		store.setState(
			withMessages((list) =>
				updateMessage(list, messageId, (message) => ({
					...message,
					reactions,
				})),
			),
		);
	});

	return {
		set: api.messages.react,
		clear: (messageId) => api.messages.react(messageId, ''),
	};
}
