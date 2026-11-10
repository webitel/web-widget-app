export type WidgetErrorCode =
	| 'network'
	| 'auth'
	| 'captcha'
	| 'forbidden_file'
	| 'file_too_large'
	| 'upload_failed'
	| 'rate_limited'
	| 'server'
	| 'unknown';

export interface WidgetErrorOptions {
	status?: number;
	details?: unknown;
	cause?: unknown;
}

export class WidgetError extends Error {
	readonly code: WidgetErrorCode;
	readonly status: number | undefined;
	readonly details: unknown;

	constructor(
		code: WidgetErrorCode,
		message: string,
		options: WidgetErrorOptions = {},
	) {
		super(message, {
			cause: options.cause,
		});
		this.name = 'WidgetError';
		this.code = code;
		this.status = options.status;
		this.details = options.details;
	}
}

export function toWidgetError(error: unknown): WidgetError {
	if (error instanceof WidgetError) return error;
	return new WidgetError(
		'unknown',
		error instanceof Error ? error.message : String(error),
		{
			cause: error,
		},
	);
}

export function statusError(
	status: number,
	details: unknown,
	fallback: WidgetErrorCode,
): WidgetError {
	return new WidgetError(
		codeFromStatus(status, fallback),
		`Request failed with status ${status}`,
		{
			status,
			details,
		},
	);
}

function codeFromStatus(
	status: number,
	fallback: WidgetErrorCode,
): WidgetErrorCode {
	if (status === 401) return 'auth';
	if (status === 413) return 'file_too_large';
	if (status === 429) return 'rate_limited';
	if (status >= 500) return 'server';
	return fallback;
}
