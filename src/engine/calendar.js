// ปฏิทินและการคำนวณพื้นฐาน (ข้อเท็จจริงเชิงปฏิทิน + ธรรมเนียมที่ระบุไว้ชัดเจน)
// ไฟล์นี้เป็นฟังก์ชันบริสุทธิ์ ไม่แตะ DOM และไม่ส่งข้อมูลออกนอกเบราว์เซอร์

export const BE_OFFSET = 543;
export const MIN_YEAR_BE = 2443; // ค.ศ. 1900
export const THAILAND_UTC_OFFSET = 7; // สมมติฐาน: ใช้เวลามาตรฐานประเทศไทย UTC+7

export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

// ตำแหน่งอ้างอิงสำหรับคำนวณเวลาพระอาทิตย์ขึ้นโดยประมาณ (ระดับภูมิภาค ไม่ใช่ระดับจังหวัด)
export const REGIONS = [
  { id: 'bkk', label: 'กรุงเทพฯ และปริมณฑล', ref: 'กรุงเทพฯ', lat: 13.7563, lon: 100.5018 },
  { id: 'central', label: 'ภาคกลาง', ref: 'พระนครศรีอยุธยา', lat: 14.3532, lon: 100.5689 },
  { id: 'north', label: 'ภาคเหนือ', ref: 'เชียงใหม่', lat: 18.7883, lon: 98.9853 },
  { id: 'northeast', label: 'ภาคตะวันออกเฉียงเหนือ', ref: 'ขอนแก่น', lat: 16.4322, lon: 102.8236 },
  { id: 'east', label: 'ภาคตะวันออก', ref: 'ชลบุรี', lat: 13.3611, lon: 100.9847 },
  { id: 'west', label: 'ภาคตะวันตก', ref: 'กาญจนบุรี', lat: 14.0228, lon: 99.5328 },
  { id: 'south', label: 'ภาคใต้', ref: 'สุราษฎร์ธานี', lat: 9.1382, lon: 99.3215 },
  { id: 'abroad', label: 'ต่างประเทศ', ref: null, lat: null, lon: null },
];

export function regionById(id) {
  return REGIONS.find((r) => r.id === id) || null;
}

export function isLeapYear(ce) {
  return (ce % 4 === 0 && ce % 100 !== 0) || ce % 400 === 0;
}

export function daysInMonth(ce, month) {
  return [31, isLeapYear(ce) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

export function isValidDate(ce, month, day) {
  return Number.isInteger(ce) && Number.isInteger(month) && Number.isInteger(day)
    && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(ce, month);
}

/** 0 = อาทิตย์ ... 6 = เสาร์ (ตามปฏิทินสุริยคติ) */
export function weekday(ce, month, day) {
  return new Date(Date.UTC(ce, month - 1, day)).getUTCDay();
}

export function dayOfYear(ce, month, day) {
  return Math.round((Date.UTC(ce, month - 1, day) - Date.UTC(ce, 0, 1)) / 86400000) + 1;
}

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const norm = (v, m) => ((v % m) + m) % m;

/**
 * เวลาพระอาทิตย์ขึ้นโดยประมาณ (นาทีนับจากเที่ยงคืน ตามเวลาท้องถิ่น)
 * ใช้อัลกอริทึม Sunrise/Sunset จาก Almanac for Computers (1990) — ความคลาดเคลื่อนปกติไม่กี่นาที
 */
export function sunriseMinutes(lat, lon, ce, month, day, utcOffset = THAILAND_UTC_OFFSET) {
  const N = dayOfYear(ce, month, day);
  const lngHour = lon / 15;
  const t = N + (6 - lngHour) / 24;
  const M = 0.9856 * t - 3.289;
  const L = norm(M + 1.916 * Math.sin(rad(M)) + 0.02 * Math.sin(rad(2 * M)) + 282.634, 360);
  let RA = norm(deg(Math.atan(0.91764 * Math.tan(rad(L)))), 360);
  RA += Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90;
  RA /= 15;
  const sinDec = 0.39782 * Math.sin(rad(L));
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(rad(90.833)) - sinDec * Math.sin(rad(lat))) / (cosDec * Math.cos(rad(lat)));
  if (cosH > 1 || cosH < -1) return null; // ไม่เกิดขึ้นในละติจูดของประเทศไทย
  const H = (360 - deg(Math.acos(cosH))) / 15;
  const T = H + RA - 0.06571 * t - 6.622;
  const local = norm(T - lngHour + utcOffset, 24);
  return Math.round(local * 60);
}

export const DAYS = [
  { id: 'sun', name: 'อาทิตย์', color: 'แดง', deity: 'พระอาทิตย์', num: 1 },
  { id: 'mon', name: 'จันทร์', color: 'เหลือง', deity: 'พระจันทร์', num: 2 },
  { id: 'tue', name: 'อังคาร', color: 'ชมพู', deity: 'พระอังคาร', num: 3 },
  { id: 'wed', name: 'พุธ (กลางวัน)', color: 'เขียว', deity: 'พระพุธ', num: 4 },
  { id: 'thu', name: 'พฤหัสบดี', color: 'ส้ม', deity: 'พระพฤหัสบดี', num: 5 },
  { id: 'fri', name: 'ศุกร์', color: 'ฟ้า', deity: 'พระศุกร์', num: 6 },
  { id: 'sat', name: 'เสาร์', color: 'ม่วง', deity: 'พระเสาร์', num: 7 },
];
export const WED_NIGHT = { id: 'wedn', name: 'พุธ (กลางคืน)', color: 'เขียว (ตามวันพุธ)', deity: 'พระราหู', num: 8 };

/**
 * วันเกิดตามธรรมเนียมโหราศาสตร์ไทย: นับวันใหม่เมื่อพระอาทิตย์ขึ้น
 * และแยกพุธกลางคืน (ตั้งแต่ 18:00 จนก่อนรุ่งเช้า)
 */
export function thaiAstroDay({ ce, month, day, minutes, regionId }) {
  const civil = weekday(ce, month, day);
  const notes = [];
  let dow = civil;
  let shifted = false;
  let sunrise = null;

  if (minutes == null) {
    notes.push('ไม่ทราบเวลาเกิด จึงใช้วันตามปฏิทินโดยไม่ปรับตามเวลาพระอาทิตย์ขึ้น');
  } else if (regionId === 'abroad') {
    notes.push('เกิดต่างประเทศ ระบบยังไม่ปรับตามเวลาพระอาทิตย์ขึ้นของสถานที่จริง');
  } else {
    const region = regionById(regionId) || regionById('bkk');
    sunrise = sunriseMinutes(region.lat, region.lon, ce, month, day);
    if (!regionId) notes.push('ไม่ได้ระบุภูมิภาค จึงใช้เวลาพระอาทิตย์ขึ้นของกรุงเทพฯ โดยประมาณ');
    if (sunrise != null && minutes < sunrise) {
      dow = (civil + 6) % 7;
      shifted = true;
      notes.push(`เกิดก่อนพระอาทิตย์ขึ้น (ประมาณ ${formatMinutes(sunrise)} น.) จึงนับเป็นวันก่อนหน้าตามธรรมเนียมไทย`);
    }
  }

  let info = DAYS[dow];
  if (dow === 3 && minutes != null && (shifted || minutes >= 18 * 60)) info = WED_NIGHT;
  return { ...info, civilDow: civil, shifted, sunrise, notes };
}

export const ZODIAC_ANIMALS = [
  'ชวด (หนู)', 'ฉลู (วัว)', 'ขาล (เสือ)', 'เถาะ (กระต่าย)', 'มะโรง (งูใหญ่)', 'มะเส็ง (งูเล็ก)',
  'มะเมีย (ม้า)', 'มะแม (แพะ)', 'วอก (ลิง)', 'ระกา (ไก่)', 'จอ (สุนัข)', 'กุน (หมู)',
];

/** ปีนักษัตรแบบนับตามปีปฏิทิน (สมมติฐาน: เปลี่ยนนักษัตร 1 มกราคม) */
export function zodiacAnimal(ce, month) {
  const animal = ZODIAC_ANIMALS[norm(ce - 4, 12)];
  const note = month <= 4
    ? 'เกิดช่วงต้นปี ตามธรรมเนียมบางสำนักนักษัตรเปลี่ยนเมื่อขึ้นปีใหม่จีนหรือไทย จึงอาจนับเป็นปีก่อนหน้า'
    : null;
  return { animal, note };
}

const SIGNS = [
  ['มังกร', 1, 19], ['กุมภ์', 2, 18], ['มีน', 3, 20], ['เมษ', 4, 19], ['พฤษภ', 5, 20], ['มิถุน', 6, 20],
  ['กรกฎ', 7, 22], ['สิงห์', 8, 22], ['กันย์', 9, 22], ['ตุล', 10, 22], ['พิจิก', 11, 21], ['ธนู', 12, 21],
];

/** ราศีแบบสากล (Tropical) ตามช่วงวันที่ที่ใช้กันทั่วไป */
export function tropicalSign(month, day) {
  for (const [name, m, last] of SIGNS) {
    if (month === m) return day <= last ? name : SIGNS[m % 12][0];
  }
  return null;
}

export function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseTime(str) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(str || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

/** อายุเต็มปี ณ วันที่กำหนด */
export function ageOn(birth, today) {
  let age = today.ce - birth.ce;
  if (today.month < birth.month || (today.month === birth.month && today.day < birth.day)) age -= 1;
  return age;
}
