import type { ThreadUpdates } from '../api/types';
import { addMemberChange } from '../features/members';
import type { FeatureContext, HistoryFeature } from '../features/types';
import { withMessages, withReadStates, withThread } from '../store/chat';
import { deleteMessage, upsertMessage } from '../store/messages';
import type { Sync } from './types';

export function createSync(
	ctx: FeatureContext,
	history: Pick<HistoryFeature, 'loadLatest'>,
): Sync {
	const { api, store, session, cursor, report } = ctx;
	let loading: Promise<void> | undefined;
	let ready = false;

	const load = () => {
		loading ??= (async () => {
			await session.identify();
			await history.loadLatest();
			ready = true;
		})().catch((error: unknown) => {
			loading = undefined;
			throw error;
		});
		return loading;
	};

	const applyThreadUpdates = (thread: ThreadUpdates) => {
		const { threadId } = thread;
		const current = store.getSnapshot().threadId;
		if (current && threadId !== current) return;

		store.setState(withThread(threadId));
		store.setState(
			withMessages((list) =>
				thread.deleted.reduce(
					(result, { id, deletedAt }) => deleteMessage(result, id, deletedAt),
					thread.messages.reduce(upsertMessage, list),
				),
			),
		);

		for (const change of thread.memberChanges) {
			addMemberChange(ctx, threadId, change);
		}

		store.setState(withReadStates(thread.readStates));
	};

	const catchUp = async (from = cursor.get()) => {
		const updates = await api.updates.get(from);
		if (updates.resync) {
			await history.loadLatest();
		} else {
			updates.threads.forEach(applyThreadUpdates);
		}
		cursor.save(updates.cursor);
	};

	ctx.events.on('connected', ({ updatesCursor }) => {
		if (!loading) load().catch(report);
		else if (ready && updatesCursor !== cursor.get()) catchUp().catch(report);
	});

	ctx.events.on('resync', (event) => {
		if (ready) catchUp(event.cursor ?? cursor.get()).catch(report);
	});

	return {
		load,
		reset() {
			loading = undefined;
			ready = false;
		},
	};
}
