import { setupWorker } from 'msw/browser';
import {
	dropConnection,
	handlers,
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
			operatorJoins,
			operatorLeaves,
			dropConnection,
		},
	});
}
