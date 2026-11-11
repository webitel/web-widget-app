import type { Session } from '../session';
import type { HttpClient } from '../transport/http';
import type { Socket } from '../transport/socket';
import { type AuthEndpoints, createAuthApi } from './auth';
import { createMessagesApi, type MessageEndpoints } from './messages';
import { createThreadsApi, type ThreadEndpoints } from './threads';
import { createUpdatesApi, type UpdateEndpoints } from './updates';

export interface ApiOptions {
	http: HttpClient;
	socket: Socket;
	session: Session;
	channelId: string;
}

export interface Api {
	auth: AuthEndpoints;
	threads: ThreadEndpoints;
	messages: MessageEndpoints;
	updates: UpdateEndpoints;
}

export function createApi(options: ApiOptions): Api {
	return {
		auth: createAuthApi(options),
		threads: createThreadsApi(options),
		messages: createMessagesApi(options),
		updates: createUpdatesApi(options),
	};
}
