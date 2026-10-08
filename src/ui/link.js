// ลิงก์สาธารณะและ QR code — สร้างเฉพาะเมื่อมี URL ที่เผยแพร่จริง
import { CONFIG } from '../config.js';
import qrcode from '../vendor/qrcode.mjs';

export function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * คืน URL สาธารณะของแอป หรือ null ถ้ายังไม่มี
 * ลำดับ: ค่าใน config.publicUrl → URL ปัจจุบันถ้าเปิดบน *.github.io → null
 */
export function getPublicUrl(config = CONFIG, loc = window.location) {
  if (config.publicUrl && isHttpUrl(config.publicUrl)) return config.publicUrl;
  if (loc && /\.github\.io$/i.test(loc.hostname) && loc.protocol === 'https:') {
    return `${loc.origin}${loc.pathname}`;
  }
  return null;
}

/** สร้าง SVG ของ QR code (ไม่มี style attribute เพื่อให้ผ่าน CSP) */
export function qrSvg(text, label) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 4;
  const size = n + quiet * 2;
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    }
  }
  const safeLabel = String(label).replace(/[<>&"]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="${safeLabel}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#FFFFFF"/><path d="${d}" fill="#000000"/></svg>`;
}
