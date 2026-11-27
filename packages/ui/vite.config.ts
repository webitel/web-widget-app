import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';
import { shadowAliases } from './build/shadow-aliases.ts';

// [Claude] Two builds of the same sources. The default one is the npm package: core stays external, the site's bundler resolves it. `--mode script` is the single file for sites (dist/script/webitel-widget.js): core included, loaded with one <script type="module"> tag. It stays an ES module, not IIFE, so the chat window can still be split into a chunk that loads on first open.
export default defineConfig(({ mode }) => {
	const isScript = mode === 'script';

	return {
		plugins: [
			vue(),
		],
		resolve: {
			alias: shadowAliases,
		},
		// [Claude] Vue is bundled into both builds, and library mode leaves `process.env.NODE_ENV` as is, which would throw in the browser.
		define: {
			'process.env.NODE_ENV': JSON.stringify('production'),
		},
		build: {
			lib: {
				entry: isScript ? 'src/script.ts' : 'src/index.ts',
				formats: [
					'es',
				],
				fileName: isScript ? 'webitel-widget' : 'index',
			},
			outDir: isScript ? 'dist/script' : 'dist',
			sourcemap: true,
			// [Claude] Read by build/check-size.ts to tell what loads with the page from what loads later.
			manifest: isScript,
			rollupOptions: {
				external: isScript
					? []
					: [
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
	};
});
