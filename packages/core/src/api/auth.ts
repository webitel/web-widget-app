import { readIdentity } from '../wire/identity';
import { field } from '../wire/read';
import type { ApiOptions, AuthEndpoints } from './types';

export function createAuthApi({ http }: ApiOptions): AuthEndpoints {
	return {
		async me() {
			const response = await http.request({
				path: 'v1/auth/token',
			});
			return readIdentity(field(response, 'contact'));
		},
	};
}
