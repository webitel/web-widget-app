export interface RetryPolicy {
	initialDelay: number;
	maxDelay: number;
}

export interface RetryScheduler {
	readonly isPending: boolean;
	schedule(): void;
	runNow(): void;
	cancel(): void;
	restart(): void;
}

export interface BrowserWatcherHandlers {
	onOffline: () => void;
	onOnline: () => void;
	onVisible: () => void;
}

export interface BrowserWatcher {
	start(): void;
	stop(): void;
}
