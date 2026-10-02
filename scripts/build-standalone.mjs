import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, '.build');
let html = await readFile(resolve(output, 'index.html'), 'utf8');

const stylesheet = /<link rel="stylesheet" crossorigin href="(\/assets\/[^"<>]+\.css)">/;
const script = /<script type="module" crossorigin src="(\/assets\/[^"<>]+\.js)"><\/script>/;
const cssPath = stylesheet.exec(html)?.[1];
const jsPath = script.exec(html)?.[1];
if (!cssPath || !jsPath) throw new Error('Vite не создал ожидаемые CSS и JS для автономной страницы');

const css = await readFile(resolve(output, `.${cssPath}`), 'utf8');
const js = await readFile(resolve(output, `.${jsPath}`), 'utf8');
html = html.replace(stylesheet, `<style>${css}</style>`);
html = html.replace(script, () => `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`);
if (/<(?:script|link)[^>]+(?:src|href)=/.test(html)) throw new Error('В автономной странице остались внешние ресурсы');

const localFile = resolve(root, '1C_ERP25_2026_research_answer_key.html');
const hostedFile = resolve(root, 'public/index.html');
await mkdir(dirname(hostedFile), { recursive: true });
await Promise.all([writeFile(localFile, html), writeFile(hostedFile, html)]);
console.log('Готово: автономный HTML и public/index.html для Vercel.');
