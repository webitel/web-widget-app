import { upsertMessage } from '../../store/messages';
import type { Message } from '../../types/message';
import type { FeatureContext, HistoryFeature } from '../types';

const PAGE_SIZE = 50;

export function createHistoryFeature(ctx: FeatureContext): HistoryFeature {
	const { api, store } = ctx;
	let olderCursor: string | undefined;
	let loadingOlder: Promise<void> | undefined;

	const loadLatest = async () => {
		const latest = await api.threads.latest();
		const threadId = latest.threadId ?? store.getSnapshot().threadId;

		const page = threadId
			? await api.messages.page(threadId, PAGE_SIZE)
			: undefined;
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
		ctx.cursor.save(page?.updatesCursor ?? latest.updatesCursor);
	};

	const loadOlder = async () => {
		const { threadId } = store.getSnapshot();
		if (!threadId || !olderCursor) return;

		const page = await api.messages.page(threadId, PAGE_SIZE, olderCursor);
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
