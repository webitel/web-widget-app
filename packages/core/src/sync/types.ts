export interface Cursor {
	get(): string | undefined;
	save(value: string | undefined): void;
}

export interface Sync {
	load(): Promise<void>;
	reset(): void;
}
