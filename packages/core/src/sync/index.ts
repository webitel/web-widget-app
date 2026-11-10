import type { FeatureContext } from '../features/context';
import type { HistoryFeature } from '../features/history';
import { toWidgetError } from '../shared/errors';
import { withHorizon, withMessages, withThread } from '../store/chat';
import { deleteMessage, upsertMessage } from '../store/messages';
import { isSameIdentity, readIdentity } from '../wire/identity';
import { decodeMessage } from '../wire/message';
import {
	field,
	readBoolean,
	readList,
	readNumber,
	readString,
	readTime,
} from '../wire/read';

export interface Sync {
	load(): Promise<void>;
	reset(): void;
}

export function createSync(
	ctx: FeatureContext,
	history: Pick<HistoryFeature, 'loadLatest'>,
): Sync {
	const { http, store, session, cursor } = ctx;
	let loading: Promise<void> | undefined;
	let ready = false;

	const report = (error: unknown) => {
		ctx.emitter.emit('error', toWidgetError(error));
	};

	const identify = async () => {
		const response = await http.request({
			path: 'v1/auth/token',
		});
		session.self = readIdentity(field(response, 'contact'));
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

	const applyThreadUpdates = (thread: unknown) => {
		const threadId = readString(thread, 'thread_id');
		const current = store.getSnapshot().threadId;
		if (current && threadId !== current) return;

		store.setState(withThread(threadId));

		const messages = readList(thread, 'messages').flatMap(
			(item) => decodeMessage(item, session.self) ?? [],
		);
		const deleted = readList(thread, 'deleted_messages');
		store.setState(
			withMessages((list) => {
				let result = messages.reduce(upsertMessage, list);
				for (const item of deleted) {
					const id = readString(item, 'id');
					if (!id) continue;
					result = deleteMessage(result, id, readTime(item, 'deleted_at'));
				}
				return result;
			}),
		);

		for (const readState of readList(thread, 'read_states')) {
			const member = readIdentity(field(field(readState, 'member'), 'contact'));
			const isSelf = isSameIdentity(member, session.self);
			const delivered = readNumber(readState, 'delivered_up_to_seq');
			const read = readNumber(readState, 'read_up_to_seq');
			if (delivered) {
				store.setState(withHorizon(isSelf, 'delivered', delivered));
			}
			if (read) {
				store.setState(withHorizon(isSelf, 'read', read));
			}
		}
	};

	const catchUp = async () => {
		const response = await http.request({
			method: 'POST',
			path: 'v1/updates',
			body: {
				cursor: cursor.get(),
			},
		});

		if (readBoolean(response, 'resync')) {
			await history.loadLatest();
			return;
		}

		for (const thread of readList(response, 'threads')) {
			applyThreadUpdates(thread);
		}
		cursor.save(readString(response, 'cursor'));
	};

	ctx.events.on('envelope', ({ event }) => {
		if (event.type === 'connected') {
			if (!loading) load().catch(report);
			else if (ready && event.updatesCursor !== cursor.get()) {
				catchUp().catch(report);
			}
		}
		if (event.type === 'resync' && ready) {
			cursor.save(event.cursor);
			catchUp().catch(report);
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
