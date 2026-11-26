// [Claude] Where overlays go when their anchor lives inside the widget's shadow root: the dedicated layer created by setupShadowRoot, or the shadow root itself if the layer is missing.
export const OVERLAY_LAYER_ATTRIBUTE = 'data-webitel-overlays';

export const findOverlayLayer = (
	node: Node | null | undefined,
): ParentNode | null => {
	const root = node?.getRootNode();
	if (!(root instanceof ShadowRoot)) {
		return null;
	}
	return root.querySelector(`[${OVERLAY_LAYER_ATTRIBUTE}]`) ?? root;
};
