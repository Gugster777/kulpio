import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = resolve(root, 'src', 'app');
const output = resolve(root, 'kulpio_app.html');

const clientParts = [
  ...Array.from({ length: 11 }, (_, i) => `00-locales-${String(i + 1).padStart(2, '0')}.js`),
  '01-foundation.js',
  '02-ui-products.js',
  '03-recipes.js',
  '04-wallet-account.js',
  '05-scanner.js',
  '06-ui-init.js',
];

const [shell, css, ...parts] = await Promise.all([
  readFile(resolve(source, 'shell.html'), 'utf8'),
  readFile(resolve(source, 'styles.css'), 'utf8'),
  ...clientParts.map(name => readFile(resolve(source, 'client', name), 'utf8')),
]);

if ((shell.match(/<!-- KULPIO:STYLES -->/g) || []).length !== 1
  || (shell.match(/<!-- KULPIO:CLIENT -->/g) || []).length !== 1) {
  throw new Error('src/app/shell.html must contain one styles and one client placeholder');
}

const html = shell
  // Use callback replacements: CSS and JavaScript legitimately contain `$`
  // sequences, which String.replace would otherwise interpret as backrefs.
  .replace('<!-- KULPIO:STYLES -->', () => `<style>\n${css}</style>`)
  .replace('<!-- KULPIO:CLIENT -->', () => `<script>\n${parts.join('\n')}</script>`);

await writeFile(output, html);
console.log(`Built ${output} from ${clientParts.length} client sections.`);
