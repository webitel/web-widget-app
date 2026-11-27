import WtButton from '@webitel/ui-sdk/components/wt-button/wt-button.vue';
import WtLoader from '@webitel/ui-sdk/components/wt-loader/wt-loader.vue';
import WebitelUiLean from '@webitel/ui-sdk/lean';
import { en } from 'primelocale/js/en.js';
import PButton from 'primevue/button';
import Tooltip from 'primevue/tooltip';
import type { App } from 'vue';

// [Claude] Only the ui-sdk and PrimeVue pieces the widget renders, plus the children ui-sdk components resolve by global name instead of importing them (WtButton renders WtLoader and PButton).
export const installUi = (app: App): void => {
	app.use(WebitelUiLean, {
		components: {
			WtButton,
			WtLoader,
		},
		primevueComponents: {
			PButton,
		},
		directives: {
			tooltip: Tooltip,
		},
		locale: en,
	});
};
