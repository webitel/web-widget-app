import { withLatestPage, withOlderPage } from '../../store/chat';
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

		store.setState(
			withLatestPage(threadId, page?.messages ?? [], olderCursor !== undefined),
		);
		ctx.cursor.save(page?.updatesCursor ?? latest.updatesCursor);
	};

	const loadOlder = async () => {
		const { threadId } = store.getSnapshot();
		if (!threadId || !olderCursor) return;

		const page = await api.messages.page(threadId, PAGE_SIZE, olderCursor);
		olderCursor = page.olderCursor;
		store.setState(withOlderPage(page.messages, olderCursor !== undefined));
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
