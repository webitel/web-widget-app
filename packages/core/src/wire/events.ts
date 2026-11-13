import { contactOf, readIdentity } from './identity';
import { decodeSocketMemberChange } from './member';
import { decodeMessage, decodeReactions } from './message';
import { field, readList, readNumber, readString, readTime } from './read';
import type { Identity, ServerEnvelope, ServerEvent } from './types';

export function decodeServerEnvelope(
	data: unknown,
	self: Identity | undefined,
): ServerEnvelope {
	const envelope = parseJson(data);
	const payload = field(envelope, 'payload');
	const [name = 'invalid', body] =
		typeof payload === 'object' && payload !== null
			? (Object.entries(payload)[0] ?? [])
			: [];

	return {
		updatesCursor:
			name === 'connected_event'
				? undefined
				: readString(body, 'updates_cursor'),
		event: decodeEvent(name, body, readString(envelope, 'id'), self),
	};
}

function decodeEvent(
	name: string,
	body: unknown,
	eventId: string | undefined,
	self: Identity | undefined,
): ServerEvent {
	switch (name) {
		case 'connected_event':
			return {
				type: 'connected',
				updatesCursor: readString(body, 'updates_cursor'),
			};
		case 'disconnected_event':
			return {
				type: 'disconnected',
				code: readNumber(body, 'code'),
				status: readString(body, 'status'),
			};
		case 'resync_event':
			return {
				type: 'resync',
				cursor: readString(body, 'cursor'),
			};
		case 'message_event': {
			const message = decodeMessage(body, self);
			if (!message) break;
			return {
				type: 'message',
				eventId,
				message,
			};
		}
		case 'message_edited_event':
			return {
				type: 'message_edited',
				id: readString(body, 'id'),
				text: readString(body, 'body') ?? '',
				version: readNumber(body, 'version') ?? 0,
				editedAt: readTime(body, 'edited_at'),
			};
		case 'message_deleted_event':
			return {
				type: 'message_deleted',
				id: readString(body, 'id'),
				deletedAt: readTime(body, 'deleted_at'),
			};
		case 'message_status_event':
			return {
				type: 'message_status',
				status: readString(body, 'status'),
				member: readIdentity(contactOf(body, 'member')),
				messageId: readString(body, 'message_id'),
				upToSeq: readNumber(body, 'up_to_seq'),
			};
		case 'message_reaction_event':
			return {
				type: 'reaction',
				messageId: readString(body, 'message_id'),
				reactions: decodeReactions(readList(body, 'reactions')),
			};
		case 'member_added_event':
			return {
				type: 'member',
				eventId,
				threadId: readString(body, 'thread_id'),
				change: decodeSocketMemberChange('joined', body),
			};
		case 'member_left_event':
			return {
				type: 'member',
				eventId,
				threadId: readString(body, 'thread_id'),
				change: decodeSocketMemberChange('left', body),
			};
		case 'typing_event':
			return {
				type: 'typing',
				from: readIdentity(contactOf(body, 'from')),
				name: readString(contactOf(body, 'from'), 'name'),
				timeoutMs: readNumber(body, 'timeout_ms') ?? 0,
			};
	}
	return {
		type: 'unknown',
		name,
		payload: body,
	};
}

function parseJson(data: unknown): unknown {
	if (typeof data !== 'string') return undefined;
	try {
		return JSON.parse(data);
	} catch {
		return undefined;
	}
}
