import type { InteractiveApi } from '../../types/client';
import type { FeatureContext } from '../types';

export function createInteractiveFeature({
	api,
}: FeatureContext): InteractiveApi {
	return {
		press: api.messages.press,
	};
}
