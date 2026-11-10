import type {
	Message,
	MessageAuthor,
	MessageFile,
	MessageReaction,
	MessageType,
} from '../types/message';
import { type Identity, isSameIdentity, readIdentity } from './identity';
import {
	field,
	readBoolean,
	readList,
	readNumber,
	readString,
	readTime,
} from './read';

const knownTypes: MessageType[] = [
	'text',
	'image',
	'document',
	'system',
	'interactive',
	'location',
	'contact',
];

export function decodeMessage(
	source: unknown,
	self: Identity | undefined,
): Message | undefined {
	const id = readString(source, 'id');
	if (!id) return undefined;

	const contact = field(field(source, 'sender'), 'contact');
	const type = decodeType(source);
	const createdAt = readTime(source, 'created_at') ?? Date.now();

	return {
		id,
		sendId: readString(source, 'send_id'),
		threadId: readString(source, 'thread_id'),
		seq: readNumber(source, 'seq'),
		type,
		author: decodeAuthor(type, contact, self),
		senderName: readString(contact, 'name'),
		text: readString(source, 'body') ?? '',
		images: readList(source, 'images').map(decodeFile),
		files: readList(source, 'documents').map(decodeFile),
		replyToId: readString(field(source, 'reply_to'), 'message_id'),
		createdAt,
		editedAt: readTime(source, 'edited_at'),
		deletedAt:
			readTime(source, 'deleted_at') ??
			(readBoolean(source, 'deleted') ? createdAt : undefined),
		version: readNumber(source, 'version') ?? 0,
		status: 'sent',
		reactions: decodeReactions(readList(source, 'reactions')),
		raw: source,
	};
}

export function decodeReactions(list: unknown[]): MessageReaction[] {
	return list.flatMap((item) => {
		const emoji = readString(item, 'emoji');
		if (!emoji) return [];
		return {
			emoji,
			count: readNumber(item, 'count') ?? 0,
			reactedByMe: readBoolean(item, 'reacted_by_me'),
		};
	});
}

function decodeType(source: unknown): MessageType {
	const value = field(source, 'type');
	const known = knownTypes.find((type) => type === value);
	if (known) return known;

	if (field(source, 'system')) return 'system';
	if (readList(source, 'documents').length) return 'document';
	if (readList(source, 'images').length) return 'image';
	if (field(source, 'interactive')) return 'interactive';
	if (field(source, 'location')) return 'location';
	if (field(source, 'contact')) return 'contact';
	if (readString(source, 'body')) return 'text';
	return 'unknown';
}

function decodeAuthor(
	type: MessageType,
	contact: unknown,
	self: Identity | undefined,
): MessageAuthor {
	if (type === 'system') return 'system';
	if (readBoolean(contact, 'is_bot')) return 'bot';
	if (isSameIdentity(readIdentity(contact), self)) return 'client';
	return 'operator';
}

function decodeFile(source: unknown): MessageFile {
	return {
		id: readString(source, 'id') ?? '',
		name: readString(source, 'name'),
		mimeType: readString(source, 'mime'),
		size: readNumber(source, 'size'),
		url: readString(source, 'url'),
	};
}
