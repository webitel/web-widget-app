import { withMessages } from '../../store/chat';
import { updateMessage } from '../../store/messages';
import type { ReactionsApi } from '../../types/client';
import type { FeatureContext } from '../types';

export function createReactionsFeature(ctx: FeatureContext): ReactionsApi {
	const { api, store } = ctx;

	ctx.events.on('reaction', ({ messageId, reactions }) => {
		if (!messageId) return;
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
