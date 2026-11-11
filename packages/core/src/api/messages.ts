import { WidgetError } from '../shared/errors';
import type { ButtonPress, Variables } from '../types/client';
import type { Message } from '../types/message';
import { decodeMessages } from '../wire/message';
import {
	field,
	readList,
	readNumber,
	readString,
	readTime,
} from '../wire/read';
import type { ApiOptions } from '.';

export interface MessagePage {
	messages: Message[];
	olderCursor: string | undefined;
	updatesCursor: string | undefined;
}

export interface SendTextRequest {
	text: string;
	sendId: string;
	threadId: string | undefined;
	replyToId: string | undefined;
	variables: Variables;
}

export interface SentMessage {
	id: string | undefined;
	threadId: string | undefined;
}

export interface EditedMessage {
	version: number;
	editedAt: number | undefined;
}

export interface MessageEndpoints {
	page(threadId: string, size: number, before?: string): Promise<MessagePage>;
	sendText(request: SendTextRequest): Promise<SentMessage>;
	edit(id: string, text: string): Promise<EditedMessage>;
	delete(id: string): Promise<number | undefined>;
	react(id: string, emoji: string): Promise<void>;
	press(id: string, button: ButtonPress): Promise<void>;
	ack(eventId: string): void;
}

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
		async sendText(request) {
			const { threadId } = request;
			const response = await http.request({
				method: 'POST',
				path: 'v1/messages/text',
				body: {
					body: request.text,
					send_id: request.sendId,
					to: threadId
						? {
								thread_id: threadId,
							}
						: {
								channel_id: channelId,
							},
					variables: threadId ? undefined : request.variables,
					reply_to_message_id: request.replyToId,
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
