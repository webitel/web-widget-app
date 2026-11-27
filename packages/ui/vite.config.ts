import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

const fromHere = (path: string): string =>
	fileURLToPath(new URL(path, import.meta.url));

// [Claude] The real file behind `primevue/tooltip`, so src/shadow/shadow-tooltip.ts can extend it without the alias pointing back at itself.
const originalTooltip = createRequire(import.meta.url).resolve(
	'primevue/tooltip',
);

export default defineConfig({
	plugins: [
		vue(),
	],
	resolve: {
		// [Claude] Shadow DOM support for ui-sdk (see src/shadow): PrimeVue's style injection, its overlay Portal and v-tooltip are swapped for versions that target the widget's shadow root instead of document.head / document.body. The aliases also apply inside pre-bundled dependencies and the library build.
		alias: [
			{
				find: /^@primevue\/core\/usestyle$/,
				replacement: fromHere('./src/shadow/shadow-use-style.ts'),
			},
			{
				find: /^primevue\/usestyle$/,
				replacement: fromHere('./src/shadow/shadow-use-style.ts'),
			},
			{
				find: /^primevue\/portal$/,
				replacement: fromHere('./src/shadow/shadow-portal.ts'),
			},
			{
				find: /^primevue\/tooltip$/,
				replacement: fromHere('./src/shadow/shadow-tooltip.ts'),
			},
			{
				find: /^@primevue-original\/tooltip$/,
				replacement: originalTooltip,
			},
		],
	},
	build: {
		lib: {
			entry: 'src/index.ts',
			formats: [
				'es',
			],
			fileName: 'index',
		},
		sourcemap: true,
		rollupOptions: {
			external: [
				'@webitel/web-widget-core',
			],
		},
	},
	test: {
		name: 'ui',
		environment: 'happy-dom',
		alias: {
			'@webitel/web-widget-core': fileURLToPath(
				new URL('../core/src/index.ts', import.meta.url),
			),
		},
	},
});
