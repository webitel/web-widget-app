import type { Message, MessageStatus } from '../types/message';
import type { MessageEdit, MessageList } from './types';

const statusRank: Record<Exclude<MessageStatus, 'failed'>, number> = {
	sending: 0,
	sent: 1,
	delivered: 2,
	read: 3,
};

export function canChangeStatus(
	current: MessageStatus,
	next: MessageStatus,
): boolean {
	if (current === next) return false;
	if (next === 'failed') return current === 'sending';
	if (current === 'failed') return true;
	return statusRank[next] > statusRank[current];
}

export function findMessage(
	list: MessageList,
	key: string,
): Message | undefined {
	return list.find((message) => hasKey(message, key));
}

export function upsertMessage(
	list: MessageList,
	incoming: Message,
): MessageList {
	const existing = list.find((message) => isSameMessage(message, incoming));
	if (!existing) {
		return sortMessages([
			...list,
			incoming,
		]);
	}

	const merged: Message = {
		...(incoming.version >= existing.version ? incoming : existing),
		status: canChangeStatus(existing.status, incoming.status)
			? incoming.status
			: existing.status,
	};

	return sortMessages([
		...list.filter((message) => message !== existing),
		merged,
	]);
}

export function updateMessage(
	list: MessageList,
	key: string,
	update: (message: Message) => Message,
): MessageList {
	const target = findMessage(list, key);
	if (!target) return list;
	const updated = update(target);
	if (updated === target) return list;
	return list.map((message) => (message === target ? updated : message));
}

export function setMessageStatus(
	list: MessageList,
	key: string,
	status: MessageStatus,
): MessageList {
	return updateMessage(list, key, (message) =>
		canChangeStatus(message.status, status)
			? {
					...message,
					status,
				}
			: message,
	);
}

export function confirmMessage(
	list: MessageList,
	sendId: string,
	id: string,
): MessageList {
	const withId = updateMessage(list, sendId, (message) =>
		message.id === sendId
			? {
					...message,
					id,
				}
			: message,
	);
	return setMessageStatus(withId, sendId, 'sent');
}

export function editMessage(
	list: MessageList,
	key: string,
	edit: MessageEdit,
): MessageList {
	return updateMessage(list, key, (message) =>
		edit.version >= message.version
			? {
					...message,
					...edit,
				}
			: message,
	);
}

export function removeMessage(list: MessageList, key: string): MessageList {
	const target = findMessage(list, key);
	return target ? list.filter((message) => message !== target) : list;
}

export function deleteMessage(
	list: MessageList,
	key: string,
	deletedAt: number | undefined,
): MessageList {
	return updateMessage(list, key, (message) => ({
		...message,
		text: '',
		images: [],
		files: [],
		location: undefined,
		contact: undefined,
		deletedAt: deletedAt ?? Date.now(),
	}));
}

export function setOwnStatusUpTo(
	list: MessageList,
	status: 'delivered' | 'read',
	upToSeq: number,
): MessageList {
	let changed = false;
	const next = list.map((message) => {
		const reached =
			message.author === 'client' &&
			message.seq !== undefined &&
			message.seq <= upToSeq;
		if (!reached || !canChangeStatus(message.status, status)) return message;
		changed = true;
		return {
			...message,
			status,
		};
	});
	return changed ? next : list;
}

export function mergeLatestPage(
	list: MessageList,
	page: readonly Message[],
): MessageList {
	const latestSeq = Math.max(0, ...page.map((message) => message.seq ?? 0));
	return page.reduce(
		upsertMessage,
		list.filter((message) => isNewer(message, latestSeq)),
	);
}

function isNewer(message: Message, latestSeq: number): boolean {
	return message.seq === undefined
		? message.status === 'sending' || message.status === 'failed'
		: message.seq > latestSeq;
}

function hasKey(message: Message, key: string): boolean {
	return message.id === key || message.sendId === key;
}

function isSameMessage(a: Message, b: Message): boolean {
	return hasKey(a, b.id) || (b.sendId !== undefined && hasKey(a, b.sendId));
}

function sortMessages(list: Message[]): MessageList {
	return list.sort(
		(a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
	);
}
