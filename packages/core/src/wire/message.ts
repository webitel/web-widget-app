import type {
	Message,
	MessageAuthor,
	MessageContact,
	MessageFile,
	MessageLocation,
	MessageReaction,
	MessageReply,
	MessageRevision,
	MessageSystem,
	MessageType,
	RevisionAction,
} from '../types/message';
import { contactOf, isSameIdentity, readIdentity } from './identity';
import { decodeMemberAction } from './member';
import {
	field,
	readBoolean,
	readList,
	readNumber,
	readString,
	readTime,
} from './read';
import type { Identity } from './types';

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

	const contact = contactOf(source, 'sender');
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
		location: decodeLocation(field(source, 'location')),
		contact: decodeContact(field(source, 'contact')),
		replyTo: decodeReply(field(source, 'reply_to')),
		createdAt,
		editedAt: readTime(source, 'edited_at'),
		deletedAt:
			readTime(source, 'deleted_at') ??
			(readBoolean(source, 'deleted') ? createdAt : undefined),
		version: readNumber(source, 'version') ?? 0,
		status: 'sent',
		reactions: decodeReactions(readList(source, 'reactions')),
		system: decodeSystem(field(source, 'system')),
		raw: source,
	};
}

export function decodeMessages(
	list: unknown[],
	self: Identity | undefined,
): Message[] {
	return list.flatMap((item) => decodeMessage(item, self) ?? []);
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

export function decodeRevision(source: unknown): MessageRevision {
	return {
		version: readNumber(source, 'version') ?? 0,
		action: decodeRevisionAction(readString(source, 'action')),
		text: readString(source, 'body') ?? '',
		changedAt: readTime(source, 'changed_at'),
		changedBy: readString(contactOf(source, 'changed_by'), 'name'),
	};
}

const revisionActions: RevisionAction[] = [
	'created',
	'edited',
	'deleted',
];

function decodeRevisionAction(value: string | undefined): RevisionAction {
	const action = value?.replace('MESSAGE_REVISION_ACTION_', '').toLowerCase();
	return revisionActions.find((known) => known === action) ?? 'unknown';
}

function decodeSystem(source: unknown): MessageSystem | undefined {
	if (!source) return undefined;
	return {
		action: decodeMemberAction(readString(source, 'type')) ?? 'unknown',
		name: readString(field(source, 'metadata'), 'name'),
	};
}

function decodeLocation(source: unknown): MessageLocation | undefined {
	const latitude = readNumber(source, 'latitude');
	const longitude = readNumber(source, 'longitude');
	if (latitude === undefined || longitude === undefined) return undefined;
	return {
		latitude,
		longitude,
		name: readString(source, 'name'),
		address: readString(source, 'address'),
	};
}

function decodeContact(source: unknown): MessageContact | undefined {
	if (!source) return undefined;
	return {
		name: readString(source, 'name'),
		phone: readString(source, 'phone'),
		email: readString(source, 'email'),
	};
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

function decodeReply(source: unknown): MessageReply | undefined {
	const id = readString(source, 'message_id');
	if (!id) return undefined;
	return {
		id,
		text: readString(source, 'body') ?? '',
		senderName: readString(contactOf(source, 'sender'), 'name'),
		deleted: readBoolean(source, 'is_deleted'),
	};
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
