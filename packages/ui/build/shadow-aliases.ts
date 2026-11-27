import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import type { Alias } from 'vite';

const fromUi = (path: string): string =>
	fileURLToPath(new URL(`../${path}`, import.meta.url));

// [Claude] The real file behind `primevue/tooltip`, so src/shadow/shadow-tooltip.ts can extend it without the alias pointing back at itself.
const originalTooltip = createRequire(import.meta.url).resolve(
	'primevue/tooltip',
);

// [Claude] Shadow DOM support for ui-sdk (see src/shadow): PrimeVue's style injection, its overlay Portal and v-tooltip are swapped for versions that target the widget's shadow root instead of document.head / document.body. The aliases also apply inside pre-bundled dependencies and the library build. Every Vite config that compiles the ui sources needs them.
export const shadowAliases: Alias[] = [
	{
		find: /^@primevue\/core\/usestyle$/,
		replacement: fromUi('src/shadow/shadow-use-style.ts'),
	},
	{
		find: /^primevue\/usestyle$/,
		replacement: fromUi('src/shadow/shadow-use-style.ts'),
	},
	{
		find: /^primevue\/portal$/,
		replacement: fromUi('src/shadow/shadow-portal.ts'),
	},
	{
		find: /^primevue\/tooltip$/,
		replacement: fromUi('src/shadow/shadow-tooltip.ts'),
	},
	{
		find: /^@primevue-original\/tooltip$/,
		replacement: originalTooltip,
	},
];
