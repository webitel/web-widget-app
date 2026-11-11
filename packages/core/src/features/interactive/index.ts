import type { InteractiveApi } from '../../types/client';
import type { FeatureContext } from '../context';

export function createInteractiveFeature({
	api,
}: FeatureContext): InteractiveApi {
	return {
		press: api.messages.press,
	};
}
