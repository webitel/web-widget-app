import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
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
