import { isSameIdentity, readIdentity } from '../wire/identity';
import { field, readList, readNumber, readString } from '../wire/read';
import type { Identity } from '../wire/types';
import type { ReadState } from './types';

// The thread list sends only member_id, updates send the member itself.
export function decodeReadStates(
	thread: unknown,
	self: Identity | undefined,
): ReadState[] {
	const members = readList(thread, 'members');
	return readList(thread, 'read_states').map((state) => {
		const memberId = readString(state, 'member_id');
		const member =
			field(state, 'member') ??
			members.find((item) => readString(item, 'id') === memberId);
		return {
			isSelf: isSameIdentity(readIdentity(field(member, 'contact')), self),
			deliveredUpToSeq: readNumber(state, 'delivered_up_to_seq'),
			readUpToSeq: readNumber(state, 'read_up_to_seq'),
		};
	});
}
