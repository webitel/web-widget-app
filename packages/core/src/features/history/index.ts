import { upsertMessage } from '../../store/messages';
import type { Message } from '../../types/message';
import { decodeMessages } from '../../wire/message';
import { field, readList, readString } from '../../wire/read';
import type { FeatureContext } from '../context';

const PAGE_SIZE = 50;

interface Page {
	messages: Message[];
	olderCursor: string | undefined;
	updatesCursor: string | undefined;
}

export interface HistoryFeature {
	loadLatest(): Promise<void>;
	loadOlder(): Promise<void>;
}

export function createHistoryFeature(ctx: FeatureContext): HistoryFeature {
	const { http, store, session } = ctx;
	let olderCursor: string | undefined;
	let loadingOlder: Promise<void> | undefined;

	const fetchPage = async (
		threadId: string,
		before?: string,
	): Promise<Page> => {
		const response = await http.request({
			path: `v1/${threadId}/messages`,
			query: {
				size: PAGE_SIZE,
				'cursor.id': before,
			},
		});
		return {
			messages: decodeMessages(readList(response, 'items'), session.self),
			olderCursor: readString(field(response, 'next_cursor'), 'id'),
			updatesCursor: readString(response, 'updates_cursor'),
		};
	};

	const loadLatest = async () => {
		const threads = await http.request({
			path: 'v1/threads',
			query: {
				size: 1,
			},
		});
		const threadId =
			readString(readList(threads, 'items')[0], 'id') ??
			store.getSnapshot().threadId;

		const page = threadId ? await fetchPage(threadId) : undefined;
		olderCursor = page?.olderCursor;

		const messages = page?.messages ?? [];
		const latestSeq = Math.max(
			0,
			...messages.map((message) => message.seq ?? 0),
		);
		store.setState((state) => ({
			...state,
			threadId,
			hasOlder: olderCursor !== undefined,
			messages: messages.reduce(
				upsertMessage,
				state.messages.filter((message) => isNewer(message, latestSeq)),
			),
		}));
		ctx.cursor.save(
			page?.updatesCursor ?? readString(threads, 'updates_cursor'),
		);
	};

	const loadOlder = async () => {
		const { threadId } = store.getSnapshot();
		if (!threadId || !olderCursor) return;

		const page = await fetchPage(threadId, olderCursor);
		olderCursor = page.olderCursor;
		store.setState((state) => ({
			...state,
			hasOlder: olderCursor !== undefined,
			messages: page.messages.reduce(upsertMessage, state.messages),
		}));
	};

	return {
		loadLatest,
		loadOlder() {
			loadingOlder ??= loadOlder().finally(() => {
				loadingOlder = undefined;
			});
			return loadingOlder;
		},
	};
}

function isNewer(message: Message, latestSeq: number): boolean {
	return message.seq === undefined
		? message.status === 'sending' || message.status === 'failed'
		: message.seq > latestSeq;
}
