// Turns Vite's build (dist/index.html + one JS + one CSS file) into dist/artifact.html: the page content the Claude
// Artifact tool publishes. The tool wraps the page in its own document skeleton, so this keeps only the page's
// <title>, its styles, its mount point and its script, with the CSS and JS inlined.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const html = readFileSync(join(dist, 'index.html'), 'utf8');

const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? 'MySheet';
const cssFiles = [...html.matchAll(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"[^>]*>/g)].map((m) => m[1]);
const jsFiles = [...html.matchAll(/<script type="module"[^>]*src="\.\/([^"]+)"[^>]*><\/script>/g)].map((m) => m[1]);
if (jsFiles.length !== 1) throw new Error(`Expected one script in the build, found ${jsFiles.length}`);

const css = cssFiles.map((f) => readFileSync(join(dist, f), 'utf8')).join('\n');
// A literal "</script" inside the code would end the inline script early.
const js = readFileSync(join(dist, jsFiles[0]), 'utf8').replace(/<\/script/gi, '<\\/script');
const body = /<body>([\s\S]*?)<\/body>/.exec(html)?.[1] ?? '';
const mount = body.replace(/<script[\s\S]*?<\/script>/g, '').trim();

const page = `<title>${title}</title>\n<style>\n${css}\n</style>\n${mount}\n<script type="module">\n${js}\n</script>\n`;
writeFileSync(join(dist, 'artifact.html'), page);
console.log(`dist/artifact.html: ${(page.length / 1024).toFixed(1)} KB`);
