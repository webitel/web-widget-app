import { withMessages } from '../../store/chat';
import { updateMessage } from '../../store/messages';
import type { ReactionsApi } from '../../types/client';
import type { FeatureContext } from '../context';

export function createReactionsFeature(ctx: FeatureContext): ReactionsApi {
	const { http, store } = ctx;

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

	const react = async (messageId: string, emoji: string) => {
		await http.request({
			method: 'POST',
			path: `v1/messages/${messageId}/reaction`,
			body: {
				emoji,
			},
		});
	};

	return {
		set: react,
		clear: (messageId) => react(messageId, ''),
	};
}
