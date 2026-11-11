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
import type { MessagesApi } from '../../types/client';
import type { Message, MessageReply } from '../../types/message';
import type { FeatureContext } from '../context';

export type MessagesFeature = Pick<
	MessagesApi,
	'send' | 'retry' | 'edit' | 'delete'
>;

export function createMessagesFeature(ctx: FeatureContext): MessagesFeature {
	const { api, store, session } = ctx;

	const deliver = async (message: Message) => {
		const { threadId } = store.getSnapshot();
		const sendId = message.sendId ?? message.id;

		try {
			const sent = await api.messages.sendText({
				text: message.text,
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

	return {
		async send(text, options = {}) {
			const body = text.trim();
			if (!body) return;

			const { threadId, messages } = store.getSnapshot();
			const replyTo = options.replyTo
				? toReply(findMessage(messages, options.replyTo))
				: undefined;
			const message = createOutgoingMessage(body, threadId, replyTo);
			store.setState(withMessages((list) => upsertMessage(list, message)));
			await deliver(message);
		},
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
	};
}

function toReply(message: Message | undefined): MessageReply | undefined {
	if (!message) return undefined;
	return {
		id: message.id,
		text: message.text,
		senderName: message.senderName,
		deleted: message.deletedAt !== undefined,
	};
}

function createOutgoingMessage(
	text: string,
	threadId: string | undefined,
	replyTo: MessageReply | undefined,
): Message {
	const sendId = crypto.randomUUID();
	return {
		id: sendId,
		sendId,
		threadId,
		seq: undefined,
		type: 'text',
		author: 'client',
		senderName: undefined,
		text,
		images: [],
		files: [],
		replyTo,
		createdAt: Date.now(),
		editedAt: undefined,
		deletedAt: undefined,
		version: 0,
		status: 'sending',
		reactions: [],
		raw: undefined,
	};
}
