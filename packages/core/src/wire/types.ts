import type { Message, MessageReaction } from '../types/message';

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
			eventId: string | undefined;
			message: Message;
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
			type: 'member';
			eventId: string | undefined;
			threadId: string | undefined;
			change: MemberChange;
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

export type ServerEvents = {
	[E in ServerEvent as E['type']]: E;
};

export interface ServerEnvelope {
	updatesCursor: string | undefined;
	event: ServerEvent;
}

export interface Identity {
	id: string | undefined;
	sub: string;
	iss: string | undefined;
}

export type MemberAction = 'joined' | 'left';

export interface MemberChange {
	action: MemberAction;
	contactId: string | undefined;
	name: string | undefined;
	isBot: boolean;
}
