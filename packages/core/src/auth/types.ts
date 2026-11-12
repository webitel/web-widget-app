import type { IssuedToken, TokenGrant } from '../api/types';
import type { TokenProvider } from '../transport/types';
import type { AuthProvider, IdentityAuth } from '../types/auth';
import type { KeyValueStorage } from '../types/storage';

export interface TokenSource extends TokenProvider {
	stop(): void;
	reset(): void;
}

export interface TokenSourceOptions {
	auth: AuthProvider | IdentityAuth;
	storage: KeyValueStorage;
	issue: (grant: TokenGrant) => Promise<IssuedToken>;
	onRefresh: () => void;
}

export interface StoredToken {
	sub: string;
	accessToken: string;
	refreshToken: string | undefined;
	expiresAt: number | undefined;
}
