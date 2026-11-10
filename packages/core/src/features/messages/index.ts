import { toWidgetError } from '../../shared/errors';
import { withMessages, withThread } from '../../store/chat';
import {
	confirmMessage,
	deleteMessage,
	findMessage,
	setMessageStatus,
	updateMessage,
	upsertMessage,
} from '../../store/messages';
import type { Message } from '../../types/message';
import { decodeMessage } from '../../wire/message';
import { field, readString } from '../../wire/read';
import type { FeatureContext } from '../context';

export interface MessagesFeature {
	send(text: string): Promise<void>;
	retry(id: string): Promise<void>;
}

export function createMessagesFeature(ctx: FeatureContext): MessagesFeature {
	const { http, store, session } = ctx;

	const deliver = async (message: Message) => {
		const { threadId } = store.getSnapshot();
		const sendId = message.sendId ?? message.id;

		try {
			const response = await http.request({
				method: 'POST',
				path: 'v1/messages/text',
				body: {
					body: message.text,
					send_id: sendId,
					to: threadId
						? {
								thread_id: threadId,
							}
						: {
								channel_id: ctx.options.channelId,
							},
					variables: threadId ? undefined : session.variables,
				},
			});

			const id = readString(response, 'id') ?? message.id;
			store.setState(
				withThread(readString(field(response, 'to'), 'thread_id')),
			);
			store.setState(withMessages((list) => confirmMessage(list, sendId, id)));
		} catch (error) {
			store.setState(
				withMessages((list) => setMessageStatus(list, sendId, 'failed')),
			);
			throw toWidgetError(error);
		}
	};

	ctx.events.on('envelope', ({ id, event }) => {
		switch (event.type) {
			case 'message': {
				const message = decodeMessage(event.message, session.self);
				if (!message) return;
				store.setState(withThread(message.threadId));
				store.setState(withMessages((list) => upsertMessage(list, message)));
				if (message.author !== 'client' && id) {
					ctx.socket.send({
						type: 'ack',
						event_id: id,
					});
				}
				ctx.emitter.emit('message', message);
				return;
			}
			case 'message_edited': {
				const { id: messageId, text, version, editedAt } = event;
				if (!messageId) return;
				store.setState(
					withMessages((list) =>
						updateMessage(list, messageId, (message) =>
							version >= message.version
								? {
										...message,
										text,
										version,
										editedAt,
									}
								: message,
						),
					),
				);
				return;
			}
			case 'message_deleted': {
				const { id: messageId, deletedAt } = event;
				if (!messageId) return;
				store.setState(
					withMessages((list) => deleteMessage(list, messageId, deletedAt)),
				);
				return;
			}
			case 'reaction': {
				const { messageId, reactions } = event;
				if (!messageId) return;
				store.setState(
					withMessages((list) =>
						updateMessage(list, messageId, (message) => ({
							...message,
							reactions,
						})),
					),
				);
				return;
			}
			case 'typing':
				ctx.emitter.emit('typing', {
					name: event.name,
					timeoutMs: event.timeoutMs,
				});
				return;
		}
	});

	return {
		async send(text) {
			const body = text.trim();
			if (!body) return;

			const message = createOutgoingMessage(body, store.getSnapshot().threadId);
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
	};
}

function createOutgoingMessage(
	text: string,
	threadId: string | undefined,
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
		replyToId: undefined,
		createdAt: Date.now(),
		editedAt: undefined,
		deletedAt: undefined,
		version: 0,
		status: 'sending',
		reactions: [],
		raw: undefined,
	};
}
