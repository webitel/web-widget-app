// [Claude] PrimeVue's v-tooltip (registered globally by ui-sdk) always appends to document.body and later finds its element with document.getElementById, so inside a shadow root it would end up outside the widget, unstyled. These two overrides move it into the widget's overlay layer and keep finding and removing it there; the rest of the directive is PrimeVue's own.
import { ZIndex } from '@primeuix/utils/zindex';
import Tooltip from '@primevue-original/tooltip';
import type { ObjectDirective } from 'vue';
import { findOverlayLayer } from './overlay-layer';

type TooltipTarget = HTMLElement & {
	$_ptooltipId?: string | null;
};

type TooltipMethods = {
	getTooltipElement: (el: TooltipTarget) => HTMLElement | null;
};

const ShadowTooltip: ObjectDirective = Tooltip.extend('tooltip', {
	methods: {
		getTooltipElement(el: TooltipTarget): HTMLElement | null {
			const id = el.$_ptooltipId;
			if (!id) {
				return null;
			}
			const root = el.getRootNode();
			const inShadowRoot =
				root instanceof ShadowRoot ? root.getElementById(id) : null;
			if (inShadowRoot) {
				return inShadowRoot;
			}
			// [Claude] `create` has just appended it to document.body; the first lookup (from `align`, right after creation) moves it next to the widget.
			const inPage = document.getElementById(id);
			const layer = findOverlayLayer(el);
			if (inPage && layer) {
				layer.append(inPage);
			}
			return inPage;
		},
		remove(this: TooltipMethods, el?: TooltipTarget): void {
			if (!el) {
				return;
			}
			const tooltipElement = this.getTooltipElement(el);
			if (tooltipElement?.isConnected) {
				ZIndex.clear(tooltipElement);
				tooltipElement.remove();
			}
			el.$_ptooltipId = null;
		},
	},
});

export default ShadowTooltip;
