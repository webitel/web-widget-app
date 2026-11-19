import { decodeThreadMemberChange } from '../wire/member';
import { decodeMessages } from '../wire/message';
import { readBoolean, readList, readString, readTime } from '../wire/read';
import { decodeReadStates } from './read-states';
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
		readStates: decodeReadStates(thread, session.self),
		memberChanges: readList(thread, 'member_changes').flatMap(
			(item) => decodeThreadMemberChange(item) ?? [],
		),
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
