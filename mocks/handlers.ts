import { delay, HttpResponse, http, type WebSocketHandler, ws } from 'msw';

export const MOCK_BASE_URL = 'https://fake.webitel.local';

const THREAD_ID = 'thread-1';

let tokens = 0;

const client = {
	id: 'member-client',
	contact: {
		id: 'contact-client',
		sub: 'client-1',
		iss: 'widget',
		name: 'You',
	},
};

const operator = {
	id: 'member-operator',
	contact: {
		id: 'contact-operator',
		sub: 'operator-1',
		iss: 'webitel',
		name: 'Operator Anna',
	},
};

type Peer = typeof client;

interface TokenBody {
	identity?: {
		sub: string;
		iss: string;
		name?: string;
	};
	refresh_token?: string;
}

interface SendTextBody {
	body: string;
	send_id?: string;
	reply_to_message_id?: string;
}

interface LocationBody {
	latitude: number;
	longitude: number;
	name?: string;
	address?: string;
	send_id?: string;
	reply_to_message_id?: string;
}

interface ContactBody {
	name?: string;
	phone_number?: string;
	email?: string;
	send_id?: string;
	reply_to_message_id?: string;
}

interface EditBody {
	body: string;
}

interface DeleteBody {
	ids: string[];
}

interface ReactionBody {
	emoji: string;
}

interface CallbackBody {
	button_code: string;
}

interface UpdatesBody {
	cursor?: string;
}

interface MockRevision {
	version: number;
	action: string;
	body: string;
	changed_at: string;
	changed_by: Peer;
}

interface MockContent {
	type: 'text' | 'location' | 'contact';
	body: string;
	location?: Omit<LocationBody, 'send_id' | 'reply_to_message_id'>;
	contact?: {
		name?: string | undefined;
		phone?: string | undefined;
		email?: string | undefined;
	};
}

interface MockMessage extends MockContent {
	id: string;
	send_id: string | undefined;
	thread_id: string;
	seq: number;
	created_at: number;
	sender: Peer;
	version: number;
	edited_at?: number;
	deleted?: boolean;
	reply_to:
		| {
				message_id: string;
				body: string;
				sender: Peer;
		  }
		| undefined;
	revisions: MockRevision[];
}

const messages: Array<{
	cursor: number;
	message: MockMessage;
}> = [];
let threadExists = false;
let seq = 0;
let cursor = 0;

const im = ws.link(`${MOCK_BASE_URL.replace(/^http/, 'ws')}/ws/im`);

const envelope = (payload: object) =>
	JSON.stringify({
		id: crypto.randomUUID(),
		created_at: Date.now(),
		payload,
	});

const broadcast = (payload: object) => im.broadcast(envelope(payload));

const findMessage = (id: string) =>
	messages.find((item) => item.message.id === id)?.message;

const revise = (message: MockMessage, action: string, by: Peer) => {
	message.revisions.push({
		version: message.revisions.length + 1,
		action: `MESSAGE_REVISION_ACTION_${action}`,
		body: message.body,
		changed_at: String(Date.now()),
		changed_by: by,
	});
};

const addMessage = (
	sender: Peer,
	content: MockContent | string,
	sendId?: string,
	replyToId?: string,
) => {
	const quoted = replyToId ? findMessage(replyToId) : undefined;
	seq += 1;
	cursor += 1;
	const message: MockMessage = {
		id: crypto.randomUUID(),
		send_id: sendId,
		thread_id: THREAD_ID,
		seq,
		created_at: Date.now(),
		...(typeof content === 'string'
			? {
					type: 'text',
					body: content,
				}
			: content),
		sender,
		version: 1,
		reply_to: quoted && {
			message_id: quoted.id,
			body: quoted.body,
			sender: quoted.sender,
		},
		revisions: [],
	};
	revise(message, 'CREATED', sender);
	messages.push({
		cursor,
		message,
	});
	broadcast({
		message_event: {
			...message,
			updates_cursor: String(cursor),
		},
	});
	return message;
};

const replyTo = (message: MockMessage) => {
	setTimeout(() => {
		broadcast({
			message_status_event: {
				thread_id: THREAD_ID,
				status: 'read',
				member: operator,
				up_to_seq: message.seq,
			},
		});
	}, 600);
	setTimeout(() => {
		broadcast({
			typing_event: {
				thread_id: THREAD_ID,
				timeout_ms: 2000,
				from: operator,
			},
		});
	}, 800);
	setTimeout(
		() => addMessage(operator, `Echo: ${message.body || message.type}`),
		2000,
	);
};

const sent = async (
	content: MockContent | string,
	sendId: string | undefined,
	replyToId: string | undefined,
) => {
	await delay(150);
	if (!threadExists) {
		threadExists = true;
		memberEvent(client, 'joined');
		setTimeout(operatorJoins, 300);
	}
	const message = addMessage(client, content, sendId, replyToId);
	replyTo(message);
	return HttpResponse.json({
		id: message.id,
		to: {
			thread_id: THREAD_ID,
		},
	});
};

const memberEvent = (peer: Peer, action: 'joined' | 'left') => {
	cursor += 1;
	broadcast({
		[action === 'joined' ? 'member_added_event' : 'member_left_event']: {
			thread_id: THREAD_ID,
			contact_id: peer.contact.id,
			metadata: {
				name: peer.contact.name,
			},
			updates_cursor: String(cursor),
			action,
		},
	});
};

export function operatorJoins(): void {
	memberEvent(operator, 'joined');
}

export function operatorLeaves(): void {
	memberEvent(operator, 'left');
}

export function operatorSays(text: string): void {
	threadExists = true;
	addMessage(operator, text);
}

export function dropConnection(): void {
	for (const connection of im.clients) {
		connection.close(3000, 'dropped');
	}
}

const socketHandler: WebSocketHandler = im.addEventListener(
	'connection',
	({ client: connection }) => {
		connection.addEventListener('message', (event) => {
			const frame = JSON.parse(String(event.data));
			if (!frame['x-webitel-access']) return;
			connection.send(
				envelope({
					connected_event: {
						ok: true,
						updates_cursor: String(cursor),
					},
				}),
			);
		});
	},
);

export const handlers = [
	socketHandler,

	http.post<never, TokenBody>(
		`${MOCK_BASE_URL}/v1/auth/token`,
		async ({ request }) => {
			const { identity } = await request.json();
			await delay(100);
			if (identity) {
				client.contact.sub = identity.sub;
				client.contact.iss = identity.iss;
			}
			tokens += 1;
			return HttpResponse.json({
				contact: client.contact,
				token: {
					access_token: `mock-access-${tokens}`,
					refresh_token: `mock-refresh-${tokens}`,
					expires_in: 3600,
					token_type: 'bearer',
				},
			});
		},
	),

	http.get(`${MOCK_BASE_URL}/v1/auth/token`, async () => {
		await delay(150);
		return HttpResponse.json({
			contact: client.contact,
		});
	}),

	http.get(`${MOCK_BASE_URL}/v1/threads`, async () => {
		await delay(150);
		return HttpResponse.json({
			items: threadExists
				? [
						{
							id: THREAD_ID,
						},
					]
				: [],
			updates_cursor: String(cursor),
		});
	}),

	http.get(`${MOCK_BASE_URL}/v1/:threadId/messages`, async () => {
		await delay(150);
		return HttpResponse.json({
			items: messages.map((item) => item.message).reverse(),
			updates_cursor: String(cursor),
		});
	}),

	http.post<never, SendTextBody>(
		`${MOCK_BASE_URL}/v1/messages/text`,
		async ({ request }) => {
			const { body, send_id, reply_to_message_id } = await request.json();
			return sent(body, send_id, reply_to_message_id);
		},
	),

	http.post<never, LocationBody>(
		`${MOCK_BASE_URL}/v1/messages/location`,
		async ({ request }) => {
			const { send_id, reply_to_message_id, ...location } =
				await request.json();
			return sent(
				{
					type: 'location',
					body: '',
					location,
				},
				send_id,
				reply_to_message_id,
			);
		},
	),

	http.post<never, ContactBody>(
		`${MOCK_BASE_URL}/v1/messages/contact`,
		async ({ request }) => {
			const { send_id, reply_to_message_id, name, phone_number, email } =
				await request.json();
			return sent(
				{
					type: 'contact',
					body: '',
					contact: {
						name,
						phone: phone_number,
						email,
					},
				},
				send_id,
				reply_to_message_id,
			);
		},
	),

	http.get<{
		id: string;
	}>(`${MOCK_BASE_URL}/v1/messages/:id/revisions`, ({ params }) =>
		HttpResponse.json({
			items: findMessage(params.id)?.revisions ?? [],
		}),
	),

	http.post<never, UpdatesBody>(
		`${MOCK_BASE_URL}/v1/updates`,
		async ({ request }) => {
			const { cursor: since } = await request.json();
			await delay(150);
			return HttpResponse.json({
				cursor: String(cursor),
				threads: [
					{
						thread_id: THREAD_ID,
						messages: messages
							.filter((item) => item.cursor > Number(since ?? 0))
							.map((item) => item.message),
					},
				],
			});
		},
	),

	http.patch<
		{
			id: string;
		},
		EditBody
	>(`${MOCK_BASE_URL}/v1/messages/:id`, async ({ params, request }) => {
		const { body } = await request.json();
		const message = findMessage(params.id);
		if (!message)
			return new HttpResponse(null, {
				status: 404,
			});
		message.body = body;
		message.version += 1;
		message.edited_at = Date.now();
		revise(message, 'EDITED', message.sender);
		broadcast({
			message_edited_event: {
				id: message.id,
				thread_id: THREAD_ID,
				body,
				version: message.version,
				edited_at: message.edited_at,
			},
		});
		return HttpResponse.json({
			id: message.id,
			version: message.version,
			edited_at: String(message.edited_at),
		});
	}),

	http.post<never, DeleteBody>(
		`${MOCK_BASE_URL}/v1/messages/delete`,
		async ({ request }) => {
			const { ids } = await request.json();
			const deletedAt = Date.now();
			const deleted = ids.flatMap((id) => {
				const message = findMessage(id);
				if (!message) return [];
				revise(message, 'DELETED', message.sender);
				message.body = '';
				delete message.location;
				delete message.contact;
				message.deleted = true;
				broadcast({
					message_deleted_event: {
						id,
						thread_id: THREAD_ID,
						deleted_at: deletedAt,
					},
				});
				return [
					id,
				];
			});
			return HttpResponse.json({
				deleted_ids: deleted,
				deleted_at: String(deletedAt),
			});
		},
	),

	http.post<
		{
			id: string;
		},
		ReactionBody
	>(
		`${MOCK_BASE_URL}/v1/messages/:id/reaction`,
		async ({ params, request }) => {
			const { emoji } = await request.json();
			broadcast({
				message_reaction_event: {
					message_id: params.id,
					thread_id: THREAD_ID,
					reactions: emoji
						? [
								{
									emoji,
									count: 1,
									reacted_by_me: true,
								},
							]
						: [],
				},
			});
			return HttpResponse.json({});
		},
	),

	http.post<
		{
			id: string;
		},
		CallbackBody
	>(
		`${MOCK_BASE_URL}/v1/messages/interactive/:id/callback`,
		async ({ request }) => {
			const { button_code } = await request.json();
			setTimeout(() => addMessage(operator, `You pressed ${button_code}`), 500);
			return HttpResponse.json({});
		},
	),

	http.post(`${MOCK_BASE_URL}/v1/threads/:threadId/typing`, () =>
		HttpResponse.json({}),
	),

	http.post(`${MOCK_BASE_URL}/v1/threads/:threadId/variables`, () =>
		HttpResponse.json({}),
	),

	http.post(`${MOCK_BASE_URL}/v1/threads/:threadId/read`, () =>
		HttpResponse.json({}),
	),
];
