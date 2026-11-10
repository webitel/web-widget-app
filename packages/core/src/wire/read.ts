export function field(source: unknown, key: string): unknown {
	return typeof source === 'object' && source !== null
		? Reflect.get(source, key)
		: undefined;
}

export function readString(source: unknown, key: string): string | undefined {
	const value = field(source, key);
	return typeof value === 'string' && value !== '' ? value : undefined;
}

export function readNumber(source: unknown, key: string): number | undefined {
	const value = field(source, key);
	if (typeof value === 'number') return value;
	if (typeof value !== 'string' || value === '') return undefined;
	const number = Number(value);
	return Number.isFinite(number) ? number : undefined;
}

export function readTime(source: unknown, key: string): number | undefined {
	const value = readNumber(source, key);
	return value ? value : undefined;
}

export function readBoolean(source: unknown, key: string): boolean {
	return field(source, key) === true;
}

export function readList(source: unknown, key: string): unknown[] {
	const value = field(source, key);
	return Array.isArray(value) ? value : [];
}
