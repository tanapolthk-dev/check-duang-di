// การจำข้อมูลบนเครื่องผู้ใช้ (localStorage) — ทำเฉพาะเมื่อผู้ใช้เลือก "จำข้อมูลบนเครื่องนี้"
// ข้อมูลไม่ถูกส่งไปเซิร์ฟเวอร์ใด และลบได้ทุกเมื่อ
import { CONFIG } from '../config.js';
import { LEGACY_REGION_TO_PROVINCE } from '../engine/calendar.js';

const FIELDS = ['day', 'month', 'yearBE', 'time', 'timeUnknown', 'province'];

export function loadRemembered() {
  try {
    const raw = window.localStorage.getItem(CONFIG.storageKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    const clean = {};
    for (const f of FIELDS) if (f in data) clean[f] = data[f];
    // ข้อมูลจากเวอร์ชัน 0.1.0 เก็บเป็นภูมิภาค → แปลงเป็นจังหวัดอ้างอิงเดิมของภูมิภาคนั้น
    if (!clean.province && data.region && LEGACY_REGION_TO_PROVINCE[data.region]) {
      clean.province = LEGACY_REGION_TO_PROVINCE[data.region];
    }
    return clean;
  } catch {
    return null;
  }
}

export function saveRemembered(input) {
  try {
    const clean = {};
    for (const f of FIELDS) clean[f] = input[f];
    window.localStorage.setItem(CONFIG.storageKey, JSON.stringify(clean));
    return true;
  } catch {
    return false;
  }
}

export function clearRemembered() {
  try {
    window.localStorage.removeItem(CONFIG.storageKey);
    return true;
  } catch {
    return false;
  }
}

export function hasRemembered() {
  return loadRemembered() !== null;
}
