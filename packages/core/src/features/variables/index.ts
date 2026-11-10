import type { VariablesApi } from '../../types/client';
import type { FeatureContext } from '../context';

export function createVariablesFeature(ctx: FeatureContext): VariablesApi {
	const { session, store } = ctx;

	return {
		get: () => ({
			...session.variables,
		}),
		async set(variables) {
			session.variables = {
				...session.variables,
				...variables,
			};

			const { threadId } = store.getSnapshot();
			if (!threadId) return;

			await ctx.http.request({
				method: 'POST',
				path: `v1/threads/${threadId}/variables`,
				body: {
					variables: Object.entries(variables).map(([key, value]) => ({
						key,
						value,
					})),
				},
			});
		},
	};
}
