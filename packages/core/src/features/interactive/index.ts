import type { InteractiveApi } from '../../types/client';
import type { FeatureContext } from '../context';

export function createInteractiveFeature(ctx: FeatureContext): InteractiveApi {
	return {
		async press(messageId, button) {
			await ctx.http.request({
				method: 'POST',
				path: `v1/messages/interactive/${messageId}/callback`,
				body: {
					button_code: button.code,
					callback_data: button.data,
				},
			});
		},
	};
}
