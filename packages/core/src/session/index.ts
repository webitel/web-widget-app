import type { Variables } from '../types/client';
import type { Identity } from '../wire/identity';

export interface Session {
	readonly self: Identity | undefined;
	readonly variables: Variables;
	identify(): Promise<void>;
	addVariables(variables: Variables): void;
	reset(): void;
}

export function createSession(
	whoAmI: () => Promise<Identity | undefined>,
): Session {
	let self: Identity | undefined;
	let variables: Variables = {};

	return {
		get self() {
			return self;
		},
		get variables() {
			return variables;
		},
		async identify() {
			self = await whoAmI();
		},
		addVariables(next) {
			variables = {
				...variables,
				...next,
			};
		},
		reset() {
			self = undefined;
			variables = {};
		},
	};
}
