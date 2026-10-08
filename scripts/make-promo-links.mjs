// สร้างลิงก์แยกตามแพลตฟอร์ม (มีพารามิเตอร์ UTM) และ QR code (SVG) ของแต่ละลิงก์
// วิธีใช้: node scripts/make-promo-links.mjs
// ผลลัพธ์: marketing/links.json และ marketing/qr/<platform>.svg
//
// หมายเหตุความเป็นส่วนตัว: พารามิเตอร์ UTM บอกแค่ว่ามาจากแพลตฟอร์มไหน ไม่มีข้อมูลส่วนบุคคล
// เว็บแอปเวอร์ชันนี้ไม่มีระบบเก็บสถิติ จึงยังไม่มีใครนับค่าเหล่านี้ (ใช้ยอดคลิกจาก Insights ของแต่ละแพลตฟอร์มแทน)
import { mkdirSync, writeFileSync } from 'node:fs';
import qrcode from '../src/vendor/qrcode.mjs';

export const BASE_URL = 'https://tanapolthk-dev.github.io/check-duang-di/';

export const PLATFORMS = [
  { id: 'main', name: 'ลิงก์หลัก (ทั่วไป/สิ่งพิมพ์)', utm: null },
  { id: 'facebook', name: 'Facebook', utm: 'facebook' },
  { id: 'instagram', name: 'Instagram', utm: 'instagram' },
  { id: 'tiktok', name: 'TikTok', utm: 'tiktok' },
  { id: 'youtube', name: 'YouTube Shorts', utm: 'youtube' },
  { id: 'x', name: 'X', utm: 'x' },
  { id: 'line', name: 'LINE', utm: 'line' },
  { id: 'threads', name: 'Threads', utm: 'threads' },
];

export function linkFor(p) {
  if (!p.utm) return BASE_URL;
  const u = new URL(BASE_URL);
  u.searchParams.set('utm_source', p.utm);
  u.searchParams.set('utm_medium', 'social');
  return u.toString();
}

export function qrSvgString(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const q = 4;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q} ${r + q}h1v1h-1z`;
  const size = n + q * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="1024" height="1024" shape-rendering="crispEdges"><title>QR: ${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</title><rect width="${size}" height="${size}" fill="#FFFFFF"/><path d="${d}" fill="#000000"/></svg>\n`;
}

const out = new URL('../marketing/', import.meta.url);
mkdirSync(new URL('qr/', out), { recursive: true });
const links = PLATFORMS.map((p) => {
  const url = linkFor(p);
  writeFileSync(new URL(`qr/${p.id}.svg`, out), qrSvgString(url));
  return { id: p.id, name: p.name, url, qr_svg: `marketing/qr/${p.id}.svg`, qr_png: `marketing/qr/${p.id}.png` };
});
writeFileSync(new URL('links.json', out), `${JSON.stringify(links, null, 2)}\n`);
for (const l of links) console.log(`${l.id.padEnd(10)} ${l.url}`);
