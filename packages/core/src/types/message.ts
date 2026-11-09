export type MessageAuthor = 'client' | 'contact-centre' | 'system';

export type MessageStatus =
	| 'sending'
	| 'sent'
	| 'delivered'
	| 'read'
	| 'failed';

export interface MessageFile {
	id: string;
	name: string;
	mimeType: string;
	size: number;
	url?: string;
}

export interface Message {
	id: string;
	sendId?: string;
	author: MessageAuthor;
	text?: string;
	files?: MessageFile[];
	createdAt: number;
	version?: number;
	status: MessageStatus;
	replyToId?: string;
	editedAt?: number;
	deletedAt?: number;
	reactions?: Record<string, number>;
}
