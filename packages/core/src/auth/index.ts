import type { IdentityClaims, IssuedToken } from '../api/types';
import type { IdentityAuth, WidgetUser } from '../types/auth';
import type { KeyValueStorage } from '../types/storage';
import { readNumber, readString } from '../wire/read';
import type { StoredToken, TokenSource, TokenSourceOptions } from './types';

const TOKEN_KEY = 'token';
const GUEST_KEY = 'guest';
const GUEST_NAME = 'Guest';
const REFRESH_MARGIN = 60_000;

export function createTokenSource(options: TokenSourceOptions): TokenSource {
	const { auth } = options;
	if ('getToken' in auth) {
		return {
			getToken: () => auth.getToken(),
			invalidate() {},
			stop() {},
			reset() {},
		};
	}
	return createIdentityTokenSource(auth, options);
}

function createIdentityTokenSource(
	auth: IdentityAuth,
	{ storage, issue, onRefresh }: TokenSourceOptions,
): TokenSource {
	let token = readStoredToken(storage);
	let pending: Promise<StoredToken> | undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;

	const claims = (): IdentityClaims => {
		const user: WidgetUser = auth.user ?? {
			sub: guestSub(storage),
		};
		return {
			...user,
			name: user.name ?? GUEST_NAME,
			iss: auth.issuer,
		};
	};

	const isUsable = (stored: StoredToken | undefined, sub: string) =>
		stored?.sub === sub &&
		(stored.expiresAt === undefined ||
			stored.expiresAt - REFRESH_MARGIN > Date.now());

	const save = (issued: IssuedToken, sub: string): StoredToken => {
		token = {
			sub,
			accessToken: issued.accessToken,
			refreshToken: issued.refreshToken,
			expiresAt:
				issued.expiresIn === undefined
					? undefined
					: Date.now() + issued.expiresIn * 1000,
		};
		storage.set(TOKEN_KEY, JSON.stringify(token));
		schedule();
		return token;
	};

	const obtain = async (): Promise<StoredToken> => {
		const identity = claims();
		const refreshToken =
			token?.sub === identity.sub ? token.refreshToken : undefined;
		if (refreshToken) {
			const refreshed = await issue({
				refreshToken,
			}).catch(() => undefined);
			if (refreshed) return save(refreshed, identity.sub);
		}
		return save(
			await issue({
				identity,
			}),
			identity.sub,
		);
	};

	const refresh = () => {
		pending ??= obtain().finally(() => {
			pending = undefined;
		});
		return pending;
	};

	const schedule = () => {
		clearTimeout(timer);
		if (token?.expiresAt === undefined) return;
		timer = setTimeout(
			() => {
				refresh().then(onRefresh, () => {});
			},
			Math.max(0, token.expiresAt - REFRESH_MARGIN - Date.now()),
		);
	};

	return {
		async getToken() {
			if (token && isUsable(token, claims().sub)) {
				if (timer === undefined) schedule();
				return token.accessToken;
			}
			return (await refresh()).accessToken;
		},
		invalidate() {
			if (token) token.expiresAt = 0;
		},
		stop() {
			clearTimeout(timer);
			timer = undefined;
		},
		reset() {
			clearTimeout(timer);
			timer = undefined;
			token = undefined;
		},
	};
}

function guestSub(storage: KeyValueStorage): string {
	const existing = storage.get(GUEST_KEY);
	if (existing) return existing;
	const sub = crypto.randomUUID();
	storage.set(GUEST_KEY, sub);
	return sub;
}

function readStoredToken(storage: KeyValueStorage): StoredToken | undefined {
	let source: unknown;
	try {
		source = JSON.parse(storage.get(TOKEN_KEY) ?? 'null');
	} catch {
		return undefined;
	}
	const sub = readString(source, 'sub');
	const accessToken = readString(source, 'accessToken');
	if (!sub || !accessToken) return undefined;
	return {
		sub,
		accessToken,
		refreshToken: readString(source, 'refreshToken'),
		expiresAt: readNumber(source, 'expiresAt'),
	};
}
