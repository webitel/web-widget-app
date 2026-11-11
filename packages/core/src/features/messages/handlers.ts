import { withMessages, withThread } from '../../store/chat';
import {
	deleteMessage,
	editMessage,
	upsertMessage,
} from '../../store/messages';
import type { FeatureContext } from '../context';

export function subscribeMessageEvents(ctx: FeatureContext): void {
	const { api, store } = ctx;

	ctx.events.on('message', ({ eventId, message }) => {
		store.setState(withThread(message.threadId));
		store.setState(withMessages((list) => upsertMessage(list, message)));
		if (message.author !== 'client' && eventId) api.messages.ack(eventId);
		ctx.emitter.emit('message', message);
	});

	ctx.events.on('message_edited', ({ id, text, version, editedAt }) => {
		if (!id) return;
		store.setState(
			withMessages((list) =>
				editMessage(list, id, {
					text,
					version,
					editedAt,
				}),
			),
		);
	});

	ctx.events.on('message_deleted', ({ id, deletedAt }) => {
		if (!id) return;
		store.setState(withMessages((list) => deleteMessage(list, id, deletedAt)));
	});
}
