<template>
  <div class="webitel-chat">
    <!-- [Claude] Placeholder until the launcher and the window shell are built. -->
    <wt-button>Chat</wt-button>
  </div>
</template>

<script setup lang="ts">
import type { WebWidgetClient } from '@webitel/web-widget-core';
import { type PropType, toRef, useShadowRoot } from 'vue';
import { provideWidgetClient } from '../composables/widget-client';
import { setupShadowRoot } from '../shadow';

const props = defineProps({
	client: {
		type: Object as PropType<WebWidgetClient | null>,
		default: null,
	},
});

// [Claude] Runs before any child renders, so ui-sdk styles, PrimeVue's theme and its overlays already target this element's shadow root.
const shadowRoot = useShadowRoot();
if (shadowRoot) {
	setupShadowRoot(shadowRoot);
}

provideWidgetClient(toRef(props, 'client'));
</script>

<style>
.webitel-chat {
  position: fixed;
  right: var(--spacing-md);
  bottom: var(--spacing-md);
}
</style>
