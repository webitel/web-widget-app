import type { Variables } from '../types/client';
import type { Identity } from '../wire/types';

export interface Session {
	readonly self: Identity | undefined;
	readonly variables: Variables;
	identify(): Promise<void>;
	addVariables(variables: Variables): void;
	reset(): void;
}
