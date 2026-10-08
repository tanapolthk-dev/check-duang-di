// สร้างไฟล์ HTML ไฟล์เดียว (dist/preview.html) สำหรับพรีวิวในที่ที่โหลดหลายไฟล์ไม่ได้
// ใช้ esbuild รวมโมดูล แล้วฝัง CSS, ฟอนต์ และสคริปต์ไว้ในไฟล์เดียว
// หมายเหตุ: ไฟล์พรีวิวตัด Content-Security-Policy ออก เพราะสคริปต์ถูกฝังแบบ inline
// เวอร์ชันที่ deploy จริงให้ใช้ไฟล์ปกติ (index.html + assets + src) ซึ่งมี CSP ครบ
// วิธีใช้: npx --yes esbuild@0.24.0 --version && node scripts/build-single-file.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p));

const js = execFileSync('npx', ['--yes', 'esbuild@0.24.0', join(ROOT, 'src/app.js'), '--bundle', '--format=iife', '--minify', '--target=es2020'], { encoding: 'utf8' });

let css = read('assets/css/styles.css').toString();
css = css.replace(/url\(\.\.\/fonts\/([^)]+)\)/g, (_, file) => `url(data:font/woff2;base64,${read(`assets/fonts/${file}`).toString('base64')})`);

let html = read('index.html').toString();
html = html
  .replace(/\s*<!-- นโยบายความปลอดภัย[^>]*-->\s*<meta http-equiv="Content-Security-Policy"[^>]*>/, '')
  .replace(/\s*<link rel="preload"[^>]*>/, '')
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="data:image/svg+xml;base64,${read('assets/img/favicon.svg').toString('base64')}">`)
  .replace(/\s*<meta property="og:image"[^>]*>/, '')
  .replace('<link rel="stylesheet" href="assets/css/styles.css">', () => `<style>${css}</style>`)
  .replace('<script type="module" src="src/app.js"></script>', '')
  .replace('</body>', () => `<script>${js.replace(/<\/script/gi, '<\\/script')}</script>\n</body>`);

mkdirSync(join(ROOT, 'dist'), { recursive: true });
writeFileSync(join(ROOT, 'dist/preview.html'), html);
console.log(`dist/preview.html ${(html.length / 1024).toFixed(0)} KB`);
