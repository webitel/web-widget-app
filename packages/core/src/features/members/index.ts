import { withMessages } from '../../store/chat';
import { upsertMessage } from '../../store/messages';
import type { MemberChange } from '../../wire/types';
import type { FeatureContext } from '../types';
import { createMemberMessage } from './message';

export function subscribeMemberEvents(ctx: FeatureContext): void {
	ctx.events.on('member', ({ eventId, threadId, change }) => {
		addMemberChange(ctx, threadId, change, eventId);
	});
}

export function addMemberChange(
	{ store, session }: FeatureContext,
	threadId: string | undefined,
	change: MemberChange,
	id: string = crypto.randomUUID(),
): void {
	const current = store.getSnapshot().threadId;
	if (current && threadId && threadId !== current) return;
	if (change.isBot) return;
	if (change.contactId && change.contactId === session.self?.id) return;

	const message = createMemberMessage(`member:${id}`, threadId, change);
	store.setState(withMessages((list) => upsertMessage(list, message)));
}
