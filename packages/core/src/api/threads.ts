import { readList, readString } from '../wire/read';
import { decodeReadStates } from './read-states';
import type { ApiOptions, ThreadEndpoints } from './types';

export function createThreadsApi({
	http,
	socket,
	session,
}: ApiOptions): ThreadEndpoints {
	return {
		async latest() {
			const response = await http.request({
				path: 'v1/threads',
				query: {
					size: 1,
				},
			});
			const thread = readList(response, 'items')[0];
			return {
				threadId: readString(thread, 'id'),
				updatesCursor: readString(response, 'updates_cursor'),
				readStates: decodeReadStates(thread, session.self),
			};
		},
		async markRead(threadId, seq) {
			const sent = socket.send({
				type: 'read',
				thread_id: threadId,
				seq,
			});
			if (sent) return;

			await http.request({
				method: 'POST',
				path: `v1/threads/${threadId}/read`,
				body: {
					up_to_seq: String(seq),
				},
			});
		},
		async setVariables(threadId, variables) {
			await http.request({
				method: 'POST',
				path: `v1/threads/${threadId}/variables`,
				body: {
					variables: Object.entries(variables).map(([key, value]) => ({
						key,
						value,
					})),
				},
			});
		},
		async typing(threadId) {
			await http.request({
				method: 'POST',
				path: `v1/threads/${threadId}/typing`,
				body: {},
			});
		},
	};
}
