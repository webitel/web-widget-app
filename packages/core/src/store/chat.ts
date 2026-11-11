import type { ChatState } from '../types/chat';
import { setOwnStatusUpTo } from './messages';
import type { MessageList, Reducer } from './types';

export const initialChatState: ChatState = {
	messages: [],
	threadId: undefined,
	readUpToSeq: 0,
	hasOlder: false,
};

export function withMessages(
	update: (messages: MessageList) => MessageList,
): Reducer {
	return (state) => {
		const messages = update(state.messages);
		return messages === state.messages
			? state
			: {
					...state,
					messages,
				};
	};
}

export function withThread(threadId: string | undefined): Reducer {
	return (state) =>
		threadId && !state.threadId
			? {
					...state,
					threadId,
				}
			: state;
}

export function withHorizon(
	isSelf: boolean,
	status: 'delivered' | 'read',
	upToSeq: number,
): Reducer {
	return (state) => {
		if (!isSelf) {
			return withMessages((messages) =>
				setOwnStatusUpTo(messages, status, upToSeq),
			)(state);
		}
		return status === 'read' && upToSeq > state.readUpToSeq
			? {
					...state,
					readUpToSeq: upToSeq,
				}
			: state;
	};
}

export function lastIncomingSeq(state: ChatState): number {
	return state.messages.reduce(
		(last, message) =>
			message.author !== 'client' && message.seq !== undefined
				? Math.max(last, message.seq)
				: last,
		0,
	);
}

export function countUnread(state: ChatState): number {
	return state.messages.filter(
		(message) =>
			message.author !== 'client' &&
			message.author !== 'system' &&
			message.seq !== undefined &&
			message.seq > state.readUpToSeq,
	).length;
}
