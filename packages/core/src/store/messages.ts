import type { Message, MessageStatus } from '../types/message';

export type MessageList = readonly Message[];

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

	const isNewer = (incoming.version ?? 0) >= (existing.version ?? 0);
	const merged: Message = {
		...(isNewer ? incoming : existing),
		status: canChangeStatus(existing.status, incoming.status)
			? incoming.status
			: existing.status,
	};

	return sortMessages([
		...list.filter((message) => message !== existing),
		merged,
	]);
}

export function setMessageStatus(
	list: MessageList,
	key: string,
	status: MessageStatus,
): MessageList {
	const target = list.find((message) => hasKey(message, key));
	if (!target || !canChangeStatus(target.status, status)) return list;

	return list.map((message) =>
		message === target
			? {
					...message,
					status,
				}
			: message,
	);
}

export function removeMessage(list: MessageList, key: string): MessageList {
	const target = list.find((message) => hasKey(message, key));
	if (!target) return list;
	return list.filter((message) => message !== target);
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
