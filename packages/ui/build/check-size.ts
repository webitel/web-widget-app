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
const BUDGETS = {
	initial: 50 * KB,
	lazy: 300 * KB,
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

const sum = (files: Set<string>): number =>
	[
		...files,
	].reduce((total, file) => total + gzipSize(file), 0);

const sizes = {
	initial: sum(filesOf(initialIds)),
	lazy: sum(filesOf(lazyIds)),
};

let isOverBudget = false;
for (const key of Object.keys(BUDGETS) as Array<keyof typeof BUDGETS>) {
	const size = sizes[key];
	const budget = BUDGETS[key];
	const isOver = size > budget;
	isOverBudget ||= isOver;
	console.log(
		`${isOver ? '✗' : '✓'} ${key}: ${(size / KB).toFixed(1)} KB gzip (budget ${budget / KB} KB)`,
	);
}

if (isOverBudget) {
	process.exitCode = 1;
}
