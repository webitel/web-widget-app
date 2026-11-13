import type { WidgetErrorCode, WidgetErrorOptions } from './types';

const userErrors: readonly WidgetErrorCode[] = [
	'forbidden_file',
	'file_too_large',
	'rate_limited',
];

export class WidgetError extends Error {
	readonly code: WidgetErrorCode;
	readonly status: number | undefined;
	readonly reason: string | undefined;
	readonly details: unknown;
	readonly technical: boolean;

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
		this.reason = options.reason;
		this.details = options.details;
		this.technical = !userErrors.includes(code);
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
			reason: readReason(details),
			details,
		},
	);
}

function codeFromStatus(
	status: number,
	fallback: WidgetErrorCode,
): WidgetErrorCode {
	if (status === 400 || status === 422) return 'bad_request';
	if (status === 401) return 'auth';
	if (status === 403) return 'forbidden';
	if (status === 404) return 'not_found';
	if (status === 413) return 'file_too_large';
	if (status === 429) return 'rate_limited';
	if (status >= 500) return 'server';
	return fallback;
}

function readReason(details: unknown): string | undefined {
	if (typeof details !== 'object' || details === null) return undefined;
	if ('message' in details && typeof details.message === 'string') {
		return details.message;
	}
	if ('detail' in details && typeof details.detail === 'string') {
		return details.detail;
	}
	return undefined;
}
