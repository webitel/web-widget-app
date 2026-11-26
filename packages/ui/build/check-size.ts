// [Claude] Size budget for the single-script build. `initial` is what every page with the widget downloads: the entry and everything it imports statically. `lazy` is what loads later through dynamic imports (the chat window on first open). Sizes are gzip, the way a CDN serves them.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

type ManifestChunk = {
	file: string;
	isEntry?: boolean;
	imports?: string[];
	dynamicImports?: string[];
	css?: string[];
};

const KB = 1024;
// [Claude] Agreed with BA on 2026-11-26 after measuring popular chat widgets: Crisp and tawk.to load ~130–265 KB with the page and add ~70–170 KB on open.
const BUDGETS = {
	initial: 350 * KB,
	lazy: 150 * KB,
};

const outDir = new URL('../dist/script/', import.meta.url);
const manifest: Record<string, ManifestChunk> = JSON.parse(
	readFileSync(new URL('.vite/manifest.json', outDir), 'utf8'),
);

const gzipSize = (file: string): number =>
	gzipSync(readFileSync(new URL(file, outDir))).length;

// [Claude] Files of the given chunks plus everything they import statically, keyed by manifest id.
const collectStatic = (ids: string[], seen: Set<string>): Set<string> => {
	for (const id of ids) {
		if (seen.has(id)) {
			continue;
		}
		seen.add(id);
		collectStatic(manifest[id]?.imports ?? [], seen);
	}
	return seen;
};

const filesOf = (ids: Iterable<string>): Set<string> => {
	const files = new Set<string>();
	for (const id of ids) {
		const chunk = manifest[id];
		if (!chunk) {
			continue;
		}
		files.add(chunk.file);
		for (const css of chunk.css ?? []) {
			files.add(css);
		}
	}
	return files;
};

const entries = Object.keys(manifest).filter((id) => manifest[id]?.isEntry);
const initialIds = collectStatic(entries, new Set());
const lazyRoots = [
	...initialIds,
].flatMap((id) => manifest[id]?.dynamicImports ?? []);
const lazyIds = collectStatic(lazyRoots, new Set(initialIds));
for (const id of initialIds) {
	lazyIds.delete(id);
}

type Part = keyof typeof BUDGETS;

const DESCRIPTIONS: Record<Part, string> = {
	initial: 'downloaded by every page with the widget',
	lazy: 'downloaded on first open of the chat window',
};

const formatKb = (bytes: number): string => `${(bytes / KB).toFixed(1)} KB`;

const measure = (ids: Iterable<string>) => {
	const files = [
		...filesOf(ids),
	]
		.map((file) => ({
			file,
			size: gzipSize(file),
		}))
		.sort((a, b) => b.size - a.size);
	return {
		files,
		total: files.reduce((total, { size }) => total + size, 0),
	};
};

const parts: Record<Part, ReturnType<typeof measure>> = {
	initial: measure(initialIds),
	lazy: measure(lazyIds),
};

console.log('Size check of the site script (dist/script), gzip:');
const failures: string[] = [];
for (const part of Object.keys(BUDGETS) as Part[]) {
	const { total, files } = parts[part];
	const budget = BUDGETS[part];
	const isOver = total > budget;
	console.log(
		`  ${isOver ? '✗' : '✓'} ${part}: ${formatKb(total)} of ${formatKb(budget)} (${DESCRIPTIONS[part]})`,
	);
	if (isOver) {
		failures.push(
			`${part} is ${formatKb(total - budget)} over its ${formatKb(budget)} budget. Largest files: ${files
				.slice(0, 3)
				.map(({ file, size }) => `${file} ${formatKb(size)}`)
				.join(', ')}`,
		);
	}
}

if (failures.length) {
	console.error(
		[
			'',
			'✗ Bundle too big: the build passed, but the site script exceeds its size budget.',
			...failures.map((failure) => `  - ${failure}`),
			'  Budgets are set in packages/ui/build/check-size.ts.',
			'',
		].join('\n'),
	);
	process.exitCode = 1;
}
