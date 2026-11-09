import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const fromRoot = (path: string) =>
	fileURLToPath(new URL(`../../${path}`, import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			'@webitel/web-widget-core': fromRoot('packages/core/src/index.ts'),
			'@webitel/web-widget-ui': fromRoot('packages/ui/src/index.ts'),
		},
	},
});
