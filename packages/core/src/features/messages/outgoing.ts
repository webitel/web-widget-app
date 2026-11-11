import type { Message, MessageReply } from '../../types/message';

export function toReply(
	message: Message | undefined,
): MessageReply | undefined {
	if (!message) return undefined;
	return {
		id: message.id,
		text: message.text,
		senderName: message.senderName,
		deleted: message.deletedAt !== undefined,
	};
}

export function createOutgoingMessage(
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
