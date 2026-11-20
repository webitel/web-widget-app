import { setupWorker } from 'msw/browser';
import {
	dropConnection,
	handlers,
	operatorAsks,
	operatorJoins,
	operatorLeaves,
	operatorSays,
} from './handlers';

export async function startMockServer(): Promise<void> {
	await setupWorker(...handlers).start({
		onUnhandledRequest: 'bypass',
		quiet: true,
	});

	Object.assign(window, {
		mockServer: {
			operatorSays,
			operatorAsks,
			operatorJoins,
			operatorLeaves,
			dropConnection,
		},
	});
}
