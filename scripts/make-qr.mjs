// สร้างไฟล์ QR code (SVG) สำหรับสื่อสิ่งพิมพ์/โซเชียล จาก URL ที่เผยแพร่จริงเท่านั้น
// วิธีใช้: node scripts/make-qr.mjs https://<ที่อยู่จริง>/
import { writeFileSync } from 'node:fs';
import qrcode from '../src/vendor/qrcode.mjs';

const url = process.argv[2];
if (!url || !/^https:\/\//.test(url)) {
  console.error('ใส่ URL https ที่ deploy แล้วจริง เช่น node scripts/make-qr.mjs https://example.github.io/app/');
  process.exit(1);
}
const qr = qrcode(0, 'M');
qr.addData(url);
qr.make();
const n = qr.getModuleCount();
const q = 4;
let d = '';
for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q} ${r + q}h1v1h-1z`;
const size = n + q * 2;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="1024" height="1024" shape-rendering="crispEdges"><title>QR: ${url}</title><rect width="${size}" height="${size}" fill="#FFFFFF"/><path d="${d}" fill="#000000"/></svg>\n`;
writeFileSync(new URL('../assets/qr/check-duang-di-qr.svg', import.meta.url), svg);
console.log(`assets/qr/check-duang-di-qr.svg (${n}x${n} modules) -> ${url}`);
