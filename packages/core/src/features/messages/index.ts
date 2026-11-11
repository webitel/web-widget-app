import type { OutgoingContent } from '../../api/types';
import { toWidgetError } from '../../shared/errors';
import { withMessages, withThread } from '../../store/chat';
import {
	confirmMessage,
	deleteMessage,
	editMessage,
	findMessage,
	removeMessage,
	setMessageStatus,
	upsertMessage,
} from '../../store/messages';
import type { SendOptions } from '../../types/client';
import type { Message } from '../../types/message';
import type { FeatureContext, MessagesFeature } from '../types';
import { subscribeMessageEvents } from './handlers';
import { createOutgoingMessage, toContent, toReply } from './outgoing';

export function createMessagesFeature(ctx: FeatureContext): MessagesFeature {
	const { api, store, session } = ctx;

	const deliver = async (message: Message) => {
		const { threadId } = store.getSnapshot();
		const sendId = message.sendId ?? message.id;

		try {
			const sent = await api.messages.send({
				content: toContent(message),
				sendId,
				threadId,
				replyToId: message.replyTo?.id,
				variables: session.variables,
			});
			store.setState(withThread(sent.threadId));
			store.setState(
				withMessages((list) =>
					confirmMessage(list, sendId, sent.id ?? message.id),
				),
			);
		} catch (error) {
			store.setState(
				withMessages((list) => setMessageStatus(list, sendId, 'failed')),
			);
			throw toWidgetError(error);
		}
	};

	const send = async (content: OutgoingContent, options: SendOptions) => {
		const { threadId, messages } = store.getSnapshot();
		const replyTo = options.replyTo
			? toReply(findMessage(messages, options.replyTo))
			: undefined;
		const message = createOutgoingMessage(content, threadId, replyTo);
		store.setState(withMessages((list) => upsertMessage(list, message)));
		await deliver(message);
	};

	subscribeMessageEvents(ctx);

	return {
		async send(text, options = {}) {
			const body = text.trim();
			if (!body) return;
			await send(
				{
					type: 'text',
					text: body,
				},
				options,
			);
		},
		sendLocation: (location, options = {}) =>
			send(
				{
					type: 'location',
					location,
				},
				options,
			),
		sendContact: (contact, options = {}) =>
			send(
				{
					type: 'contact',
					contact,
				},
				options,
			),
		async retry(id) {
			const message = findMessage(store.getSnapshot().messages, id);
			if (message?.status !== 'failed') return;
			store.setState(
				withMessages((list) => setMessageStatus(list, id, 'sending')),
			);
			await deliver(message);
		},
		async edit(id, text) {
			const body = text.trim();
			if (!body) return;

			const edited = await api.messages.edit(id, body);
			store.setState(
				withMessages((list) =>
					editMessage(list, id, {
						text: body,
						...edited,
					}),
				),
			);
		},
		async delete(id) {
			const message = findMessage(store.getSnapshot().messages, id);
			if (message?.status === 'failed') {
				store.setState(withMessages((list) => removeMessage(list, id)));
				return;
			}

			const deletedAt = await api.messages.delete(id);
			store.setState(
				withMessages((list) => deleteMessage(list, id, deletedAt)),
			);
		},
		revisions: api.messages.revisions,
	};
}
