// Prepares MySheet's own website (plans/offline-app.md): Vite's build in dist/, without the Claude page, copied to
// site/, which is pushed to this repository's gh-pages branch (GitHub Pages). Run after `npm run build`.
import { cpSync, existsSync, rmSync, writeFileSync } from 'node:fs';

if (!existsSync('dist/index.html')) throw new Error('Run npm run build first.');
rmSync('site', { recursive: true, force: true });
cpSync('dist', 'site', { recursive: true, filter: (src) => !src.endsWith('artifact.html') });
writeFileSync('site/.nojekyll', ''); // GitHub Pages serves the files as they are
console.log('site/: ready for the gh-pages branch');
