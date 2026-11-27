// [Claude] Everything a shadow root needs to host ui-sdk (PrimeVue) components: styles adopted into it, an overlay layer for popovers and tooltips, and outside-click detection that sees through the shadow boundary. Relies on the Vite aliases in packages/ui/vite.config.ts that swap PrimeVue's useStyle, Portal and Tooltip.
import { OVERLAY_LAYER_ATTRIBUTE } from './overlay-layer';
import { exposeShadowTargets } from './shadow-events';
import { registerStyleRoot } from './shadow-use-style';
import { installUiSdkStyles } from './ui-sdk-styles';

// [Claude] The layer sits at the shadow root's top level, outside the widget window, so the window's overflow and layout never clip or offset overlays, which PrimeVue positions in page coordinates. For the same reason the host element itself must stay unpositioned.
const ensureOverlayLayer = (root: ShadowRoot): void => {
	if (root.querySelector(`[${OVERLAY_LAYER_ATTRIBUTE}]`)) {
		return;
	}
	const layer = document.createElement('div');
	layer.setAttribute(OVERLAY_LAYER_ATTRIBUTE, '');
	root.append(layer);
};

export const setupShadowRoot = (root: ShadowRoot): void => {
	installUiSdkStyles();
	registerStyleRoot(root);
	ensureOverlayLayer(root);
	exposeShadowTargets(root);
};
