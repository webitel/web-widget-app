import { contactOf } from './identity';
import { field, readBoolean, readString } from './read';
import type { MemberAction, MemberChange } from './types';

export function decodeMemberAction(
	value: string | undefined,
): MemberAction | undefined {
	switch (value) {
		case 'joined':
		case 'THREAD_MEMBER_CHANGE_ACTION_JOINED':
			return 'joined';
		case 'left':
		case 'THREAD_MEMBER_CHANGE_ACTION_LEFT':
			return 'left';
	}
	return undefined;
}

export function decodeSocketMemberChange(
	action: MemberAction,
	body: unknown,
): MemberChange {
	const metadata = field(body, 'metadata');
	return {
		action,
		contactId: readString(body, 'contact_id'),
		name: readString(metadata, 'name'),
		isBot: readBoolean(metadata, 'is_bot'),
	};
}

export function decodeThreadMemberChange(
	source: unknown,
): MemberChange | undefined {
	const action = decodeMemberAction(readString(source, 'action'));
	if (!action) return undefined;

	const contact = contactOf(source, 'member');
	return {
		action,
		contactId: readString(contact, 'id'),
		name: readString(contact, 'name'),
		isBot: readBoolean(contact, 'is_bot'),
	};
}
