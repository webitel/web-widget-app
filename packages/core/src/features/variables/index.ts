import type { VariablesApi } from '../../types/client';
import type { FeatureContext } from '../types';

export function createVariablesFeature(ctx: FeatureContext): VariablesApi {
	const { api, session, store } = ctx;

	return {
		get: () => ({
			...session.variables,
		}),
		async set(variables) {
			session.addVariables(variables);

			const { threadId } = store.getSnapshot();
			if (threadId) await api.threads.setVariables(threadId, variables);
		},
	};
}
