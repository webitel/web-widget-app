export interface BrowserWatcherHandlers {
	onOffline: () => void;
	onOnline: () => void;
	onVisible: () => void;
}

export interface BrowserWatcher {
	start(): void;
	stop(): void;
}

export function createBrowserWatcher({
	onOffline,
	onOnline,
	onVisible,
}: BrowserWatcherHandlers): BrowserWatcher {
	let watching = false;

	const onVisibilityChange = () => {
		if (document.visibilityState === 'visible') onVisible();
	};

	return {
		start() {
			if (watching || typeof window === 'undefined') return;
			window.addEventListener('offline', onOffline);
			window.addEventListener('online', onOnline);
			document.addEventListener('visibilitychange', onVisibilityChange);
			watching = true;
		},
		stop() {
			if (!watching) return;
			window.removeEventListener('offline', onOffline);
			window.removeEventListener('online', onOnline);
			document.removeEventListener('visibilitychange', onVisibilityChange);
			watching = false;
		},
	};
}
