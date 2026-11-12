import { WidgetError } from '../shared/errors';
import type { ConnectionState } from '../types/client';
import { createBrowserWatcher } from './reconnect/browser-watcher';
import {
	createRetryScheduler,
	DEFAULT_RETRY_POLICY,
} from './reconnect/retry-scheduler';
import type { DisconnectEvent, Socket, SocketOptions } from './types';

const CONNECT_TIMEOUT = 10_000;

export function createSocket(options: SocketOptions): Socket {
	const url = `${options.baseUrl.replace(/\/+$/, '').replace(/^http/, 'ws')}/ws/im`;

	let ws: WebSocket | null = null;
	let state: ConnectionState = 'idle';
	let connectTimer: ReturnType<typeof setTimeout> | undefined;
	let hasConnected = false;
	let authFailures = 0;
	let lastDisconnect: DisconnectEvent | undefined;
	let waiting: Promise<void> | undefined;
	let settleWaiting: ((error?: WidgetError) => void) | undefined;

	const setState = (next: ConnectionState) => {
		if (next === state) return;
		state = next;
		options.onStateChange(next);
	};

	const settle = (error?: WidgetError): boolean => {
		if (!settleWaiting) return false;
		settleWaiting(error);
		return true;
	};

	const closeSocket = () => {
		clearTimeout(connectTimer);
		const socket = ws;
		ws = null;
		socket?.close();
	};

	const retries = createRetryScheduler(DEFAULT_RETRY_POLICY, () => open());

	const resumeRetry = () => {
		if (retries.isPending) retries.runNow();
	};

	const watcher = createBrowserWatcher({
		onOffline: () => {
			if (ws) fail(new WidgetError('network', 'Browser went offline'));
		},
		onOnline: resumeRetry,
		onVisible: resumeRetry,
	});

	const stop = (error: WidgetError): boolean => {
		retries.cancel();
		retries.restart();
		watcher.stop();
		closeSocket();
		hasConnected = false;
		authFailures = 0;
		setState('disconnected');
		return settle(error);
	};

	const fail = (error: WidgetError) => {
		closeSocket();
		settle(error);
		retries.schedule();
		setState(hasConnected ? 'reconnecting' : 'connecting');
	};

	const authenticate = async (socket: WebSocket) => {
		setState('authenticating');
		try {
			const token = await options.token.getToken();
			if (socket === ws) {
				socket.send(
					JSON.stringify({
						'x-webitel-access': token,
					}),
				);
			}
		} catch (cause) {
			if (socket === ws) {
				fail(
					new WidgetError('auth', 'Failed to get access token', {
						cause,
					}),
				);
			}
		}
	};

	const receive = (data: unknown) => {
		const envelope = options.decode(data);
		const { event } = envelope;

		if (event.type === 'connected') {
			clearTimeout(connectTimer);
			hasConnected = true;
			authFailures = 0;
			retries.restart();
			setState('connected');
			settle();
		}
		if (event.type === 'disconnected') lastDisconnect = event;

		options.onEnvelope(envelope);
	};

	const handleClose = (event: CloseEvent) => {
		const disconnect = lastDisconnect;
		lastDisconnect = undefined;

		const unauthorized =
			disconnect?.status === 'UNAUTHORIZED' ||
			disconnect?.code === 401 ||
			event.reason.startsWith('401');
		if (unauthorized) {
			authFailures += 1;
			options.token.invalidate();
		}

		const error =
			authFailures > 1
				? new WidgetError('auth', 'Socket authorization failed')
				: disconnect?.status === 'EVICTED'
					? new WidgetError('server', 'Socket connection was evicted')
					: undefined;

		if (error) {
			if (!stop(error)) options.onError(error);
			return;
		}
		fail(new WidgetError('network', 'Socket closed'));
	};

	function open() {
		closeSocket();
		const socket = new WebSocket(url);
		ws = socket;
		setState(hasConnected ? 'reconnecting' : 'connecting');

		connectTimer = setTimeout(() => {
			fail(new WidgetError('network', 'Socket connect timed out'));
		}, CONNECT_TIMEOUT);

		socket.onopen = () => {
			if (socket === ws) void authenticate(socket);
		};
		socket.onmessage = (event) => {
			if (socket === ws) receive(event.data);
		};
		socket.onclose = (event) => {
			if (socket === ws) handleClose(event);
		};
	}

	return {
		connect() {
			if (state === 'connected') return Promise.resolve();

			waiting ??= new Promise<void>((resolve, reject) => {
				settleWaiting = (error) => {
					waiting = undefined;
					settleWaiting = undefined;
					if (error) reject(error);
					else resolve();
				};
			});

			watcher.start();
			if (retries.isPending) retries.runNow();
			else if (!ws) open();

			return waiting;
		},
		disconnect() {
			stop(new WidgetError('network', 'Socket disconnected'));
		},
		restart() {
			if (!ws) return;
			retries.cancel();
			open();
		},
		send(command) {
			if (state !== 'connected' || !ws) return false;
			ws.send(JSON.stringify(command));
			return true;
		},
	};
}
