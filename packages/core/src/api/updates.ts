import { contactOf, isSameIdentity, readIdentity } from '../wire/identity';
import { decodeMessages } from '../wire/message';
import {
	readBoolean,
	readList,
	readNumber,
	readString,
	readTime,
} from '../wire/read';
import type { ApiOptions, ThreadUpdates, UpdateEndpoints } from './types';

export function createUpdatesApi({
	http,
	session,
}: ApiOptions): UpdateEndpoints {
	const decodeThread = (thread: unknown): ThreadUpdates => ({
		threadId: readString(thread, 'thread_id'),
		messages: decodeMessages(readList(thread, 'messages'), session.self),
		deleted: readList(thread, 'deleted_messages').flatMap((item) => {
			const id = readString(item, 'id');
			return id
				? {
						id,
						deletedAt: readTime(item, 'deleted_at'),
					}
				: [];
		}),
		readStates: readList(thread, 'read_states').map((state) => ({
			isSelf: isSameIdentity(
				readIdentity(contactOf(state, 'member')),
				session.self,
			),
			deliveredUpToSeq: readNumber(state, 'delivered_up_to_seq'),
			readUpToSeq: readNumber(state, 'read_up_to_seq'),
		})),
	});

	return {
		async get(cursor) {
			const response = await http.request({
				method: 'POST',
				path: 'v1/updates',
				body: {
					cursor,
				},
			});
			return {
				resync: readBoolean(response, 'resync'),
				cursor: readString(response, 'cursor'),
				threads: readList(response, 'threads').map(decodeThread),
			};
		},
	};
}
