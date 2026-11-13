import type { Message } from '../../types/message';
import type { MemberChange } from '../../wire/types';

export function createMemberMessage(
	id: string,
	threadId: string | undefined,
	change: MemberChange,
): Message {
	return {
		id,
		sendId: undefined,
		threadId,
		seq: undefined,
		type: 'system',
		author: 'system',
		senderName: change.name,
		text: '',
		images: [],
		files: [],
		location: undefined,
		contact: undefined,
		replyTo: undefined,
		createdAt: Date.now(),
		editedAt: undefined,
		deletedAt: undefined,
		version: 0,
		status: 'sent',
		reactions: [],
		system: {
			action: change.action,
			name: change.name,
		},
		raw: change,
	};
}
