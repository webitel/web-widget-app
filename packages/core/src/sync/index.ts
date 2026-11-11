import type { ThreadUpdates } from '../api/updates';
import type { FeatureContext } from '../features/context';
import type { HistoryFeature } from '../features/history';
import { toWidgetError } from '../shared/errors';
import { withHorizon, withMessages, withThread } from '../store/chat';
import { deleteMessage, upsertMessage } from '../store/messages';

export interface Sync {
	load(): Promise<void>;
	reset(): void;
}

export function createSync(
	ctx: FeatureContext,
	history: Pick<HistoryFeature, 'loadLatest'>,
): Sync {
	const { api, store, session, cursor } = ctx;
	let loading: Promise<void> | undefined;
	let ready = false;

	const report = (error: unknown) => {
		ctx.emitter.emit('error', toWidgetError(error));
	};

	const identify = async () => {
		session.self = await api.auth.me();
	};

	const load = () => {
		loading ??= (async () => {
			await identify();
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

		for (const state of thread.readStates) {
			if (state.deliveredUpToSeq) {
				store.setState(
					withHorizon(state.isSelf, 'delivered', state.deliveredUpToSeq),
				);
			}
			if (state.readUpToSeq) {
				store.setState(withHorizon(state.isSelf, 'read', state.readUpToSeq));
			}
		}
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

	ctx.events.on('envelope', ({ event }) => {
		if (event.type === 'connected') {
			if (!loading) load().catch(report);
			else if (ready && event.updatesCursor !== cursor.get()) {
				catchUp().catch(report);
			}
		}
		if (event.type === 'resync' && ready) {
			catchUp(event.cursor ?? cursor.get()).catch(report);
		}
	});

	return {
		load,
		reset() {
			loading = undefined;
			ready = false;
		},
	};
}
