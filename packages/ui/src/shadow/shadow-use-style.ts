// [Claude] Drop-in replacement for PrimeVue's `@primevue/core/usestyle`, wired in through the Vite alias in vite.config.ts. PrimeVue's own version always writes <style> tags into document.head, which never reaches a shadow root. This one keeps every stylesheet in a registry and adopts it into each registered shadow root instead, so nothing lands in the host page.
import {
	getCurrentInstance,
	onMounted,
	type Ref,
	readonly,
	ref,
	watch,
} from 'vue';

type UseStyleOptions = {
	name?: string;
	id?: string;
	first?: boolean;
	immediate?: boolean;
	manual?: boolean;
	props?: {
		name?: string;
	};
	onMounted?: (name: string) => void;
	onUpdated?: (name: string) => void;
	onLoad?: (
		event: Event | undefined,
		options: {
			name: string;
		},
	) => void;
};

type StyleRegistry = {
	roots: Set<ShadowRoot>;
	sheets: Map<string, CSSStyleSheet>;
	firstSheets: WeakSet<CSSStyleSheet>;
};

// [Claude] Kept on globalThis because Vite pre-bundles a second copy of this module into PrimeVue's dependency chunk; a module-level registry would split PrimeVue's sheets from the roots registered by setupShadowRoot.
const globalScope = globalThis as {
	__webitelShadowStyles?: StyleRegistry;
};
globalScope.__webitelShadowStyles ??= {
	roots: new Set(),
	sheets: new Map(),
	firstSheets: new WeakSet(),
};
const { roots, sheets, firstSheets } = globalScope.__webitelShadowStyles;
let styleId = 0;

// [Claude] Sheets loaded with `first` (PrimeVue's cascade-layer order) must precede the rest, as `document.head.prepend` does in the original.
const orderedSheets = (): CSSStyleSheet[] => {
	const all = [
		...sheets.values(),
	];
	return [
		...all.filter((sheet) => firstSheets.has(sheet)),
		...all.filter((sheet) => !firstSheets.has(sheet)),
	];
};

export const registerStyleRoot = (root: ShadowRoot): (() => void) => {
	roots.add(root);
	root.adoptedStyleSheets = [
		...orderedSheets(),
		...root.adoptedStyleSheets,
	];
	return () => {
		roots.delete(root);
	};
};

export const upsertSheet = (name: string, css: string, first = false): void => {
	let sheet = sheets.get(name);
	if (!sheet) {
		sheet = new CSSStyleSheet();
		sheets.set(name, sheet);
		if (first) {
			firstSheets.add(sheet);
		}
		for (const root of roots) {
			root.adoptedStyleSheets = first
				? [
						sheet,
						...root.adoptedStyleSheets,
					]
				: [
						...root.adoptedStyleSheets,
						sheet,
					];
		}
	}
	sheet.replaceSync(css);
};

// [Claude] Same timing as PrimeVue: inside a component the style loads on mount, otherwise right away.
const tryOnMounted = (fn: () => void): void => {
	const instance = getCurrentInstance() as {
		components?: unknown;
	} | null;
	if (instance?.components) {
		onMounted(fn);
	} else {
		fn();
	}
};

type UseStyleResult = {
	id: string | undefined;
	name: string;
	el: Ref<null>;
	css: Ref<string>;
	unload: () => void;
	load: (
		nextCss?: string,
		props?: {
			name?: string;
		},
	) => void;
	isLoaded: Readonly<Ref<boolean>>;
};

export const useStyle = (
	css: string,
	options: UseStyleOptions = {},
): UseStyleResult => {
	const isLoaded = ref(false);
	const cssRef = ref(css);
	const { id, first = false, immediate = true, manual = false } = options;
	let name = options.name ?? `style_${++styleId}`;
	let stop = (): void => {};

	const load = (
		nextCss?: string,
		props: {
			name?: string;
		} = {},
	): void => {
		name = props.name ?? options.props?.name ?? name;
		if (nextCss) {
			cssRef.value = nextCss;
		}
		if (isLoaded.value) {
			return;
		}
		stop = watch(
			cssRef,
			(value) => {
				const isNew = !sheets.has(name);
				upsertSheet(name, value, first);
				if (isNew) {
					options.onMounted?.(name);
				} else {
					options.onUpdated?.(name);
				}
				// [Claude] Constructable sheets have no load event; PrimeVue's Theme waits for this callback to emit 'theme:load'.
				options.onLoad?.(undefined, {
					name,
				});
			},
			{
				immediate: true,
			},
		);
		isLoaded.value = true;
	};

	// [Claude] The sheet stays in the registry: other component instances share it by name.
	const unload = (): void => {
		stop();
		isLoaded.value = false;
	};

	if (immediate && !manual) {
		tryOnMounted(() => load());
	}

	return {
		id,
		name,
		el: ref(null),
		css: cssRef,
		unload,
		load,
		isLoaded: readonly(isLoaded),
	};
};
