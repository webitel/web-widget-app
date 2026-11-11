import type { OutgoingContent } from '../../api/types';
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
	content: OutgoingContent,
	threadId: string | undefined,
	replyTo: MessageReply | undefined,
): Message {
	const sendId = crypto.randomUUID();
	return {
		id: sendId,
		sendId,
		threadId,
		seq: undefined,
		type: content.type,
		author: 'client',
		senderName: undefined,
		text: content.type === 'text' ? content.text : '',
		images: [],
		files: [],
		location: content.type === 'location' ? content.location : undefined,
		contact: content.type === 'contact' ? content.contact : undefined,
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

export function toContent(message: Message): OutgoingContent {
	if (message.location) {
		return {
			type: 'location',
			location: message.location,
		};
	}
	if (message.contact) {
		return {
			type: 'contact',
			contact: message.contact,
		};
	}
	return {
		type: 'text',
		text: message.text,
	};
}
