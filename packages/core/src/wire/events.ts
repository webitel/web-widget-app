import type { MessageReaction } from '../types/message';
import { contactOf, type Identity, readIdentity } from './identity';
import { decodeReactions } from './message';
import { field, readList, readNumber, readString, readTime } from './read';

export type ServerEvent =
	| {
			type: 'connected';
			updatesCursor: string | undefined;
	  }
	| {
			type: 'disconnected';
			code: number | undefined;
			status: string | undefined;
	  }
	| {
			type: 'resync';
			cursor: string | undefined;
	  }
	| {
			type: 'message';
			message: unknown;
	  }
	| {
			type: 'message_edited';
			id: string | undefined;
			text: string;
			version: number;
			editedAt: number | undefined;
	  }
	| {
			type: 'message_deleted';
			id: string | undefined;
			deletedAt: number | undefined;
	  }
	| {
			type: 'message_status';
			status: string | undefined;
			member: Identity | undefined;
			messageId: string | undefined;
			upToSeq: number | undefined;
	  }
	| {
			type: 'reaction';
			messageId: string | undefined;
			reactions: MessageReaction[];
	  }
	| {
			type: 'typing';
			from: Identity | undefined;
			name: string | undefined;
			timeoutMs: number;
	  }
	| {
			type: 'unknown';
			name: string;
			payload: unknown;
	  };

export interface ServerEnvelope {
	id: string | undefined;
	updatesCursor: string | undefined;
	event: ServerEvent;
}

export function decodeServerEnvelope(data: unknown): ServerEnvelope {
	const envelope = parseJson(data);
	const payload = field(envelope, 'payload');
	const [name = 'invalid', body] =
		typeof payload === 'object' && payload !== null
			? (Object.entries(payload)[0] ?? [])
			: [];

	return {
		id: readString(envelope, 'id'),
		updatesCursor:
			name === 'connected_event'
				? undefined
				: readString(body, 'updates_cursor'),
		event: decodeEvent(name, body),
	};
}

function decodeEvent(name: string, body: unknown): ServerEvent {
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
		case 'message_event':
			return {
				type: 'message',
				message: body,
			};
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
		case 'typing_event':
			return {
				type: 'typing',
				from: readIdentity(contactOf(body, 'from')),
				name: readString(contactOf(body, 'from'), 'name'),
				timeoutMs: readNumber(body, 'timeout_ms') ?? 0,
			};
		default:
			return {
				type: 'unknown',
				name,
				payload: body,
			};
	}
}

function parseJson(data: unknown): unknown {
	if (typeof data !== 'string') return undefined;
	try {
		return JSON.parse(data);
	} catch {
		return undefined;
	}
}
