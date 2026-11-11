import { readList, readString } from '../wire/read';
import type { ApiOptions, ThreadEndpoints } from './types';

export function createThreadsApi({
	http,
	socket,
}: ApiOptions): ThreadEndpoints {
	return {
		async latest() {
			const response = await http.request({
				path: 'v1/threads',
				query: {
					size: 1,
				},
			});
			return {
				threadId: readString(readList(response, 'items')[0], 'id'),
				updatesCursor: readString(response, 'updates_cursor'),
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
