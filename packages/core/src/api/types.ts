import type { Session } from '../session/types';
import type { HttpClient, Socket } from '../transport/types';
import type { ButtonPress, Variables } from '../types/client';
import type {
	Message,
	MessageContact,
	MessageLocation,
	MessageRevision,
} from '../types/message';
import type { Identity } from '../wire/types';

export interface IdentityClaims {
	sub: string;
	iss: string;
	name: string;
	email?: string | undefined;
	phone?: string | undefined;
	locale?: string | undefined;
}

export type TokenGrant =
	| {
			identity: IdentityClaims;
	  }
	| {
			refreshToken: string;
	  };

export interface IssuedToken {
	accessToken: string;
	refreshToken: string | undefined;
	expiresIn: number | undefined;
}

export interface AuthEndpoints {
	token(grant: TokenGrant): Promise<IssuedToken>;
	me(): Promise<Identity | undefined>;
}

export interface ApiOptions {
	http: HttpClient;
	socket: Socket;
	session: Session;
	clientId: string;
}

export interface Api {
	auth: AuthEndpoints;
	threads: ThreadEndpoints;
	messages: MessageEndpoints;
	updates: UpdateEndpoints;
}

export interface MessagePage {
	messages: Message[];
	olderCursor: string | undefined;
	updatesCursor: string | undefined;
}

export type OutgoingContent =
	| {
			type: 'text';
			text: string;
	  }
	| {
			type: 'location';
			location: MessageLocation;
	  }
	| {
			type: 'contact';
			contact: MessageContact;
	  };

export interface SendRequest {
	content: OutgoingContent;
	sendId: string;
	threadId: string | undefined;
	replyToId: string | undefined;
	variables: Variables;
}

export interface SentMessage {
	id: string | undefined;
	threadId: string | undefined;
}

export interface EditedMessage {
	version: number;
	editedAt: number | undefined;
}

export interface MessageEndpoints {
	page(threadId: string, size: number, before?: string): Promise<MessagePage>;
	send(request: SendRequest): Promise<SentMessage>;
	edit(id: string, text: string): Promise<EditedMessage>;
	delete(id: string): Promise<number | undefined>;
	revisions(id: string): Promise<MessageRevision[]>;
	react(id: string, emoji: string): Promise<void>;
	press(id: string, button: ButtonPress): Promise<void>;
	ack(eventId: string): void;
}

export interface ReadState {
	isSelf: boolean;
	deliveredUpToSeq: number | undefined;
	readUpToSeq: number | undefined;
}

export interface ThreadUpdates {
	threadId: string | undefined;
	messages: Message[];
	deleted: {
		id: string;
		deletedAt: number | undefined;
	}[];
	readStates: ReadState[];
}

export interface Updates {
	resync: boolean;
	cursor: string | undefined;
	threads: ThreadUpdates[];
}

export interface UpdateEndpoints {
	get(cursor: string | undefined): Promise<Updates>;
}

export interface LatestThread {
	threadId: string | undefined;
	updatesCursor: string | undefined;
}

export interface ThreadEndpoints {
	latest(): Promise<LatestThread>;
	markRead(threadId: string, seq: number): Promise<void>;
	setVariables(threadId: string, variables: Variables): Promise<void>;
	typing(threadId: string): Promise<void>;
}
