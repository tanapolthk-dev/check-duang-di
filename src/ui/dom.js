export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function announce(message) {
  const el = document.getElementById('sr-status');
  if (!el) return;
  el.textContent = '';
  // หน่วงเล็กน้อยเพื่อให้โปรแกรมอ่านหน้าจออ่านข้อความซ้ำได้
  setTimeout(() => { el.textContent = message; }, 30);
}

export const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** คัดลอกข้อความ: ใช้ Clipboard API ก่อน ถ้าใช้ไม่ได้จึงใช้วิธีเลือกข้อความ */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* ใช้วิธีสำรองด้านล่าง */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.className = 'visually-hidden';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
