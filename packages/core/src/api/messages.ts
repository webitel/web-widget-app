import { WidgetError } from '../shared/errors';
import { decodeMessages, decodeRevision } from '../wire/message';
import {
	field,
	readList,
	readNumber,
	readString,
	readTime,
} from '../wire/read';
import type { ApiOptions, MessageEndpoints, OutgoingContent } from './types';

export function createMessagesApi({
	http,
	socket,
	session,
	channelId,
}: ApiOptions): MessageEndpoints {
	return {
		async page(threadId, size, before) {
			const response = await http.request({
				path: `v1/${threadId}/messages`,
				query: {
					size,
					'cursor.id': before,
				},
			});
			return {
				messages: decodeMessages(readList(response, 'items'), session.self),
				olderCursor: readString(field(response, 'next_cursor'), 'id'),
				updatesCursor: readString(response, 'updates_cursor'),
			};
		},
		async send({ content, sendId, threadId, replyToId, variables }) {
			const response = await http.request({
				method: 'POST',
				path: `v1/messages/${content.type}`,
				body: {
					...encodeContent(content),
					send_id: sendId,
					to: threadId
						? {
								thread_id: threadId,
							}
						: {
								channel_id: channelId,
							},
					variables:
						threadId || content.type !== 'text' ? undefined : variables,
					reply_to_message_id: replyToId,
				},
			});
			return {
				id: readString(response, 'id'),
				threadId: readString(field(response, 'to'), 'thread_id'),
			};
		},
		async edit(id, text) {
			const response = await http.request({
				method: 'PATCH',
				path: `v1/messages/${id}`,
				body: {
					body: text,
				},
			});
			return {
				version: readNumber(response, 'version') ?? 0,
				editedAt: readTime(response, 'edited_at'),
			};
		},
		async delete(id) {
			const response = await http.request({
				method: 'POST',
				path: 'v1/messages/delete',
				body: {
					ids: [
						id,
					],
				},
			});
			if (!readList(response, 'deleted_ids').includes(id)) {
				throw new WidgetError('unknown', 'Message was not deleted', {
					details: readList(response, 'skipped'),
				});
			}
			return readTime(response, 'deleted_at');
		},
		async revisions(id) {
			const response = await http.request({
				path: `v1/messages/${id}/revisions`,
			});
			return readList(response, 'items').map(decodeRevision);
		},
		async react(id, emoji) {
			await http.request({
				method: 'POST',
				path: `v1/messages/${id}/reaction`,
				body: {
					emoji,
				},
			});
		},
		async press(id, button) {
			await http.request({
				method: 'POST',
				path: `v1/messages/interactive/${id}/callback`,
				body: {
					button_code: button.code,
					callback_data: button.data,
				},
			});
		},
		ack(eventId) {
			socket.send({
				type: 'ack',
				event_id: eventId,
			});
		},
	};
}

function encodeContent(content: OutgoingContent): Record<string, unknown> {
	switch (content.type) {
		case 'text':
			return {
				body: content.text,
			};
		case 'location':
			return {
				...content.location,
			};
		case 'contact':
			return {
				name: content.contact.name,
				phone_number: content.contact.phone,
				email: content.contact.email,
			};
	}
}
