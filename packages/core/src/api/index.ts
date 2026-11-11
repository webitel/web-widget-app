import { createAuthApi } from './auth';
import { createMessagesApi } from './messages';
import { createThreadsApi } from './threads';
import type { Api, ApiOptions } from './types';
import { createUpdatesApi } from './updates';

export function createApi(options: ApiOptions): Api {
	return {
		auth: createAuthApi(options),
		threads: createThreadsApi(options),
		messages: createMessagesApi(options),
		updates: createUpdatesApi(options),
	};
}
