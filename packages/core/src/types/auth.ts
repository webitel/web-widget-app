export interface AuthProvider {
	getToken(): Promise<string>;
}

export interface WidgetUser {
	sub: string;
	name?: string;
	email?: string;
	phone?: string;
	locale?: string;
}

export interface IdentityAuth {
	issuer: string;
	user?: WidgetUser;
}

export interface CaptchaProvider {
	getToken(action: string): Promise<string>;
}

export interface CaptchaOptions {
	provider: CaptchaProvider;
	header: string;
}
