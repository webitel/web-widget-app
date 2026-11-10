export type MessageType =
	| 'text'
	| 'image'
	| 'document'
	| 'system'
	| 'interactive'
	| 'location'
	| 'contact'
	| 'unknown';

export type MessageAuthor = 'client' | 'operator' | 'bot' | 'system';

export type MessageStatus =
	| 'sending'
	| 'sent'
	| 'delivered'
	| 'read'
	| 'failed';

export interface MessageFile {
	id: string;
	name: string | undefined;
	mimeType: string | undefined;
	size: number | undefined;
	url: string | undefined;
}

export interface MessageReaction {
	emoji: string;
	count: number;
	reactedByMe: boolean;
}

export interface Message {
	id: string;
	sendId: string | undefined;
	threadId: string | undefined;
	seq: number | undefined;
	type: MessageType;
	author: MessageAuthor;
	senderName: string | undefined;
	text: string;
	images: MessageFile[];
	files: MessageFile[];
	replyToId: string | undefined;
	createdAt: number;
	editedAt: number | undefined;
	deletedAt: number | undefined;
	version: number;
	status: MessageStatus;
	reactions: MessageReaction[];
	raw: unknown;
}
