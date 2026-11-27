// [Claude] Shadow DOM retargets events: a document-level listener sees `event.target` as the widget's host element, not the node that was clicked. PrimeVue overlays (and ui-sdk's usePopoverOverlayFix) decide "click outside" from document listeners via `target.contains(event.target)`, so every click inside the widget looks like an outside click and closes the overlay it just opened. For listeners outside the widget this hands back the node inside the shadow root instead of the host; listeners inside it (and inside nested shadow roots, e.g. emoji-picker-element) keep the browser's own value. Side effect: the host page's own listeners also see that inner node.
const RETARGETED_EVENTS = [
	'click',
	'mousedown',
	'pointerdown',
	'touchstart',
	'focusin',
	'keydown',
] as const;

const nativeTarget = Object.getOwnPropertyDescriptor(
	Event.prototype,
	'target',
)?.get;

export const exposeShadowTargets = (root: ShadowRoot): void => {
	const getNativeTarget = nativeTarget;
	if (!getNativeTarget) {
		return;
	}
	const { host } = root;
	for (const type of RETARGETED_EVENTS) {
		window.addEventListener(
			type,
			(event) => {
				// [Claude] composedPath() is only available while the event is being dispatched, so the inner node is resolved here, in the first (window capture) listener.
				const inner = event
					.composedPath()
					.find((node) => node instanceof Node && node.getRootNode() === root);
				if (!inner) {
					return;
				}
				Object.defineProperty(event, 'target', {
					configurable: true,
					get(this: Event) {
						const target = getNativeTarget.call(this);
						return target === host ? inner : target;
					},
				});
			},
			{
				capture: true,
			},
		);
	}
};
