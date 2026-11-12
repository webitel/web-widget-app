import { WidgetError } from '../shared/errors';
import { readIdentity } from '../wire/identity';
import { field, readNumber, readString } from '../wire/read';
import type { ApiOptions, AuthEndpoints, TokenGrant } from './types';

export function createAuthApi({ http, clientId }: ApiOptions): AuthEndpoints {
	return {
		async token(grant) {
			const response = await http.request({
				method: 'POST',
				path: 'v1/auth/token',
				body: {
					client_id: clientId,
					...encodeGrant(grant),
				},
				anonymous: true,
			});
			const token = field(response, 'token');
			const accessToken = readString(token, 'access_token');
			if (!accessToken) {
				throw new WidgetError('auth', 'Token response has no access token', {
					details: response,
				});
			}
			return {
				accessToken,
				refreshToken: readString(token, 'refresh_token'),
				expiresIn: readNumber(token, 'expires_in'),
			};
		},
		async me() {
			const response = await http.request({
				path: 'v1/auth/token',
			});
			return readIdentity(field(response, 'contact'));
		},
	};
}

function encodeGrant(grant: TokenGrant): Record<string, unknown> {
	if ('refreshToken' in grant) {
		return {
			refresh_token: grant.refreshToken,
		};
	}
	const { identity } = grant;
	return {
		identity: {
			sub: identity.sub,
			iss: identity.iss,
			name: identity.name,
			email: identity.email,
			phone_number: identity.phone,
			locale: identity.locale,
		},
	};
}
