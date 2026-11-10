import { readString } from './read';

export interface Identity {
	sub: string;
	iss: string | undefined;
}

export function readIdentity(contact: unknown): Identity | undefined {
	const sub = readString(contact, 'sub');
	if (!sub) return undefined;
	return {
		sub,
		iss: readString(contact, 'iss'),
	};
}

export function isSameIdentity(
	a: Identity | undefined,
	b: Identity | undefined,
): boolean {
	return !!a && !!b && a.sub === b.sub && a.iss === b.iss;
}
