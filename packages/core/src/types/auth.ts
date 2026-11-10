export interface AuthProvider {
	getToken(): Promise<string>;
}

export interface CaptchaProvider {
	getToken(action: string): Promise<string>;
}

export interface CaptchaOptions {
	provider: CaptchaProvider;
	header: string;
}
