/// <reference types="vite/client" />

// [Claude] Vite alias to the real `primevue/tooltip` file (see vite.config.ts). PrimeVue's public typings omit the directive's `extend()`, which exists at runtime (BaseDirective).
declare module '@primevue-original/tooltip' {
	import type { ObjectDirective } from 'vue';

	const Tooltip: ObjectDirective & {
		extend: (name: string, options: Record<string, unknown>) => ObjectDirective;
	};
	export default Tooltip;
}
