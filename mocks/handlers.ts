import { delay, HttpResponse, http, type WebSocketHandler, ws } from 'msw';

export const MOCK_BASE_URL = 'https://fake.webitel.local';

const THREAD_ID = 'thread-1';

const client = {
	id: 'member-client',
	contact: {
		sub: 'client-1',
		iss: 'widget',
		name: 'You',
	},
};

const operator = {
	id: 'member-operator',
	contact: {
		sub: 'operator-1',
		iss: 'webitel',
		name: 'Operator Anna',
	},
};

type Peer = typeof client;

interface SendTextBody {
	body: string;
	send_id?: string;
}

interface UpdatesBody {
	cursor?: string;
}

interface MockMessage {
	id: string;
	send_id: string | undefined;
	thread_id: string;
	seq: number;
	created_at: number;
	type: 'text';
	body: string;
	sender: Peer;
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

const addMessage = (sender: Peer, body: string, sendId?: string) => {
	seq += 1;
	cursor += 1;
	const message: MockMessage = {
		id: crypto.randomUUID(),
		send_id: sendId,
		thread_id: THREAD_ID,
		seq,
		created_at: Date.now(),
		type: 'text',
		body,
		sender,
	};
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
	setTimeout(() => addMessage(operator, `Echo: ${message.body}`), 2000);
};

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
			const { body, send_id } = await request.json();
			await delay(150);
			threadExists = true;
			const message = addMessage(client, body, send_id);
			replyTo(message);
			return HttpResponse.json({
				id: message.id,
				to: {
					thread_id: THREAD_ID,
				},
			});
		},
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

	http.post(`${MOCK_BASE_URL}/v1/threads/:threadId/variables`, () =>
		HttpResponse.json({}),
	),

	http.post(`${MOCK_BASE_URL}/v1/threads/:threadId/read`, () =>
		HttpResponse.json({}),
	),
];
