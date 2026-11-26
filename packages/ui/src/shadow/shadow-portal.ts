// [Claude] Re-implementation of PrimeVue's Portal (primevue/portal, ~30 lines), wired in through the Vite alias. Same props and behaviour, except that the default `appendTo: 'body'` is redirected into the widget's overlay layer when the portal renders inside a shadow root. Otherwise every PrimeVue overlay (popover, select, dialog, menu, …) would teleport out of the shadow root and lose its styles.
import {
	type Component,
	createCommentVNode,
	defineComponent,
	h,
	type PropType,
	renderSlot,
	Teleport,
} from 'vue';
import { findOverlayLayer } from './overlay-layer';

const ShadowPortal: Component = defineComponent({
	name: 'Portal',
	props: {
		appendTo: {
			type: [
				String,
				Object,
			] as PropType<string | HTMLElement>,
			default: 'body',
		},
		disabled: {
			type: Boolean,
			default: false,
		},
	},
	data: () => ({
		mounted: false,
		overlayLayer: null as ParentNode | null,
	}),
	computed: {
		inline(): boolean {
			return this.disabled || this.appendTo === 'self';
		},
		target(): string | HTMLElement | ParentNode {
			return this.appendTo === 'body' && this.overlayLayer
				? this.overlayLayer
				: this.appendTo;
		},
	},
	mounted() {
		// [Claude] Until mounted the portal renders a comment node in place, so $el tells which tree (page or shadow root) it belongs to.
		this.overlayLayer = findOverlayLayer(this.$el as Node);
		this.mounted = true;
	},
	render() {
		if (this.inline) {
			return renderSlot(this.$slots, 'default');
		}
		if (!this.mounted) {
			return createCommentVNode('', true);
		}
		return h(
			Teleport,
			{
				to: this.target,
			},
			[
				renderSlot(this.$slots, 'default'),
			],
		);
	},
});

export default ShadowPortal;
