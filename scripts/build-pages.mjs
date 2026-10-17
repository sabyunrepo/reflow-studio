import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, '_site');
await rm(output, { recursive: true, force: true });
await mkdir(join(output, 'assets'), { recursive: true });
for (const file of ['index.html', 'layout.mjs', 'psd-pixels.mjs', 'runtime-config.mjs']) {
  await cp(join(root, file), join(output, file));
}
await cp(join(root, 'vendor'), join(output, 'vendor'), { recursive: true });
for (const file of ['sample-real-banner.svg', 'reflow-demo.psd', 'SAMPLE-AI-LICENSE.txt']) {
  await cp(join(root, 'assets', file), join(output, 'assets', file));
}
await writeFile(join(output, '.nojekyll'), '');
console.log('GitHub Pages files prepared in _site/');
