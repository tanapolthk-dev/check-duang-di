// ตัวสุ่มแบบกำหนดค่าได้ (deterministic) — ข้อมูลชุดเดิมให้ผลเดิมเสมอ
// ใช้เพื่อ "จำลอง" ความแปรผันของกราฟและการเลือกข้อความ ไม่ได้มีความหมายทางโหราศาสตร์

/** FNV-1a 32-bit hash */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG คืนค่าในช่วง [0, 1) */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(list, seed) {
  return list[seed % list.length];
}
