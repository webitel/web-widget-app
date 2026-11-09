import { statusError, WidgetError } from '../shared/errors';
import { parseBody } from '../shared/parse-body';

export interface UploadProgress {
	loaded: number;
	total: number | undefined;
}

export interface UploadRequest {
	url: string;
	body: FormData | Blob;
	headers: Record<string, string>;
	signal?: AbortSignal;
	onProgress?: (progress: UploadProgress) => void;
}

export function upload({
	url,
	body,
	headers,
	signal,
	onProgress,
}: UploadRequest): Promise<unknown> {
	if (signal?.aborted) return Promise.reject(signal.reason);

	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		const abort = () => xhr.abort();

		xhr.open('POST', url);
		for (const [name, value] of Object.entries(headers)) {
			xhr.setRequestHeader(name, value);
		}

		xhr.upload.addEventListener('progress', (event) => {
			onProgress?.({
				loaded: event.loaded,
				total: event.lengthComputable ? event.total : undefined,
			});
		});

		xhr.addEventListener('load', () => {
			const details = parseBody(xhr.responseText);
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve(details);
			} else {
				reject(statusError(xhr.status, details, 'upload_failed'));
			}
		});

		xhr.addEventListener('error', () => {
			reject(new WidgetError('network', 'Upload failed: network error'));
		});

		xhr.addEventListener('abort', () => {
			reject(signal?.reason);
		});

		xhr.addEventListener('loadend', () => {
			signal?.removeEventListener('abort', abort);
		});

		signal?.addEventListener('abort', abort);
		xhr.send(body);
	});
}
