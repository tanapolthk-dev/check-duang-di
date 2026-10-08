import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sunriseMinutes, thaiAstroDay, weekday, zodiacAnimal, tropicalSign, parseTime, ageOn, isValidDate,
} from '../../src/engine/calendar.js';
import { validateBirth } from '../../src/engine/validate.js';
import { buildReading, buildLifeGraph, phaseOf, GRAPH_MAX_AGE } from '../../src/engine/reading.js';
import { hashString } from '../../src/engine/random.js';
import { PROVINCES, PROVINCE_REGIONS } from '../../src/engine/provinces.js';
import { LEGACY_REGION_TO_PROVINCE, placeById } from '../../src/engine/calendar.js';

const TODAY = { ce: 2026, month: 10, day: 8 };

test('weekday ตรงกับปฏิทินจริง', () => {
  assert.equal(weekday(2026, 10, 8), 4); // พฤหัสบดี
  assert.equal(weekday(2000, 1, 1), 6); // เสาร์
  assert.equal(weekday(1992, 12, 5), 6); // เสาร์
});

test('ปีอธิกสุรทินและวันที่ไม่ถูกต้อง', () => {
  assert.equal(isValidDate(2024, 2, 29), true);
  assert.equal(isValidDate(2023, 2, 29), false);
  assert.equal(isValidDate(1900, 2, 29), false);
  assert.equal(isValidDate(2000, 2, 29), true);
});

test('เวลาพระอาทิตย์ขึ้นกรุงเทพฯ อยู่ในช่วงที่สมเหตุสมผล', () => {
  const jan = sunriseMinutes(13.7563, 100.5018, 2026, 1, 1);
  const jun = sunriseMinutes(13.7563, 100.5018, 2026, 6, 21);
  // ค่าอ้างอิงทั่วไป: ต้นมกราคมราว 06:40, ปลายมิถุนายนราว 05:50
  assert.ok(jan >= 6 * 60 + 30 && jan <= 6 * 60 + 50, `jan=${jan}`);
  assert.ok(jun >= 5 * 60 + 42 && jun <= 6 * 60, `jun=${jun}`);
});

test('เกิดก่อนพระอาทิตย์ขึ้นนับเป็นวันก่อนหน้า และพุธกลางคืน', () => {
  // 8 ต.ค. 2026 เป็นวันพฤหัสบดี เวลา 03:00 → นับเป็นวันพุธกลางคืน
  const d = thaiAstroDay({ ce: 2026, month: 10, day: 8, minutes: 180, placeId: 'bangkok' });
  assert.equal(d.id, 'wedn');
  assert.equal(d.shifted, true);
  // วันพุธ 19:00 → พุธกลางคืน
  const w = thaiAstroDay({ ce: 2026, month: 10, day: 7, minutes: 19 * 60, placeId: 'bangkok' });
  assert.equal(w.id, 'wedn');
  // วันพุธ 10:00 → พุธกลางวัน
  assert.equal(thaiAstroDay({ ce: 2026, month: 10, day: 7, minutes: 600, placeId: 'bangkok' }).id, 'wed');
  // ไม่ทราบเวลา → ใช้วันตามปฏิทิน
  const u = thaiAstroDay({ ce: 2026, month: 10, day: 8, minutes: null, placeId: '' });
  assert.equal(u.id, 'thu');
  assert.equal(u.shifted, false);
  // ต่างประเทศ → ไม่ปรับ
  assert.equal(thaiAstroDay({ ce: 2026, month: 10, day: 8, minutes: 180, placeId: 'abroad' }).id, 'thu');
});

test('ปีนักษัตรและราศีสากล', () => {
  assert.match(zodiacAnimal(2020, 6).animal, /^ชวด/);
  assert.match(zodiacAnimal(2024, 6).animal, /^มะโรง/);
  assert.ok(zodiacAnimal(2024, 2).note);
  assert.equal(tropicalSign(1, 19), 'มังกร');
  assert.equal(tropicalSign(1, 20), 'กุมภ์');
  assert.equal(tropicalSign(12, 22), 'มังกร');
  assert.equal(tropicalSign(6, 21), 'กรกฎ');
  assert.equal(tropicalSign(6, 20), 'มิถุน');
});

test('parseTime และ ageOn', () => {
  assert.equal(parseTime('08:30'), 510);
  assert.equal(parseTime('24:00'), null);
  assert.equal(parseTime('abc'), null);
  assert.equal(ageOn({ ce: 1990, month: 10, day: 9 }, TODAY), 35);
  assert.equal(ageOn({ ce: 1990, month: 10, day: 8 }, TODAY), 36);
});

test('validateBirth: ข้อมูลถูกต้อง', () => {
  const r = validateBirth({ day: '15', month: '3', yearBE: '2535', time: '08:30', province: 'chiang-mai' }, TODAY);
  assert.equal(r.ok, true);
  assert.equal(r.value.ce, 1992);
  assert.equal(r.value.minutes, 510);
});

test('validateBirth: ข้ามเวลาเกิดได้', () => {
  const r = validateBirth({ day: '15', month: '3', yearBE: '2535', timeUnknown: true }, TODAY);
  assert.equal(r.ok, true);
  assert.equal(r.value.minutes, null);
});

test('validateBirth: ข้อความแนะนำเมื่อกรอกผิด', () => {
  const empty = validateBirth({}, TODAY);
  assert.deepEqual(Object.keys(empty.errors).sort(), ['day', 'month', 'time', 'yearBE']);
  assert.match(validateBirth({ day: 1, month: 1, yearBE: '1992', timeUnknown: true }, TODAY).errors.yearBE, /ค\.ศ\..*2535/);
  assert.match(validateBirth({ day: 31, month: 2, yearBE: '2535', timeUnknown: true }, TODAY).errors.day, /ไม่มีในเดือนกุมภาพันธ์/);
  assert.match(validateBirth({ day: 9, month: 10, yearBE: '2569', timeUnknown: true }, TODAY).errors.day, /อนาคต/);
  assert.match(validateBirth({ day: 1, month: 1, yearBE: '2400', timeUnknown: true }, TODAY).errors.yearBE, /2443/);
  assert.match(validateBirth({ day: 1, month: 1, yearBE: '25x5', timeUnknown: true }, TODAY).errors.yearBE, /4 หลัก/);
  assert.match(validateBirth({ day: 1, month: 1, yearBE: '2535', time: '25:99' }, TODAY).errors.time, /ไม่ถูกต้อง/);
  assert.ok(validateBirth({ day: 1, month: 1, yearBE: '2535', timeUnknown: true, province: 'mars' }, TODAY).errors.province);
});

test('ผลลัพธ์กำหนดค่าได้ (ข้อมูลเดิมได้ผลเดิม) และข้อมูลต่างกันได้ผลต่างกัน', () => {
  const v = validateBirth({ day: 15, month: 3, yearBE: '2535', time: '08:30', province: 'bangkok' }, TODAY).value;
  const a = buildReading(v, TODAY);
  const b = buildReading(v, TODAY);
  assert.deepEqual(a, b);
  const v2 = { ...v, day: 16 };
  assert.notDeepEqual(buildLifeGraph(v).points.map((p) => p.score), buildLifeGraph(v2).points.map((p) => p.score));
});

test('โครงสร้างผลลัพธ์ครบทุกหมวดและกราฟครบทุกอายุ', () => {
  const v = validateBirth({ day: 1, month: 1, yearBE: '2500', timeUnknown: true }, TODAY).value;
  const r = buildReading(v, TODAY);
  assert.deepEqual(r.categories.map((c) => c.id), ['overall', 'love', 'work', 'money']);
  for (const c of r.categories) {
    assert.ok(c.level >= 1 && c.level <= 5);
    assert.ok(c.text.length > 20);
  }
  assert.equal(r.graph.points.length, GRAPH_MAX_AGE + 1);
  for (const p of r.graph.points) {
    assert.ok(p.score >= 8 && p.score <= 92);
    assert.ok(p.low <= p.score && p.high >= p.score);
    assert.equal(p.phase, phaseOf(p.score));
  }
  assert.equal(r.graph.spread, 15); // ไม่ทราบเวลา → ช่วงกว้างขึ้น
  assert.equal(r.age, 69);
  assert.ok(r.rhythm.phaseInfo.name);
});

test('ผู้ที่อายุเกินช่วงกราฟยังได้ผล (จำกัดที่อายุสูงสุดของกราฟ)', () => {
  const v = validateBirth({ day: 1, month: 1, yearBE: '2443', timeUnknown: true }, TODAY).value;
  const r = buildReading(v, TODAY);
  assert.equal(r.age, GRAPH_MAX_AGE);
});

test('ผลลัพธ์ไม่มีคำที่ทำให้กลัวหรือฟันธง', () => {
  const banned = ['ตาย', 'อุบัติเหตุร้ายแรง', 'ล้มละลาย', 'แน่นอน 100', 'เคราะห์ร้าย', 'ฟันธง'];
  for (let i = 0; i < 300; i++) {
    const day = (i % 28) + 1;
    const month = (i % 12) + 1;
    const yearBE = String(2443 + ((i * 7) % 126));
    const v = validateBirth({ day, month, yearBE, timeUnknown: i % 2 === 0, time: '07:15' }, TODAY).value;
    const r = buildReading(v, TODAY);
    const text = JSON.stringify(r.categories);
    for (const w of banned) assert.ok(!text.includes(w), `พบคำว่า ${w}`);
  }
});

test('hashString คงที่', () => {
  assert.equal(hashString('abc'), hashString('abc'));
  assert.notEqual(hashString('abc'), hashString('abd'));
});

test('รายชื่อจังหวัดครบ 77 จังหวัด ไม่ซ้ำ และพิกัดอยู่ในประเทศไทย', () => {
  assert.equal(PROVINCES.length, 77);
  assert.equal(new Set(PROVINCES.map((p) => p.id)).size, 77);
  assert.equal(new Set(PROVINCES.map((p) => p.name)).size, 77);
  assert.equal(new Set(PROVINCES.map((p) => p.code)).size, 77);
  const regionIds = new Set(PROVINCE_REGIONS.map((r) => r.id));
  for (const p of PROVINCES) {
    assert.ok(regionIds.has(p.region), p.name);
    assert.ok(p.lat > 5.5 && p.lat < 20.5 && p.lon > 97.3 && p.lon < 105.7, `${p.name} พิกัดนอกประเทศไทย`);
  }
});

test('เวลาพระอาทิตย์ขึ้นต่างกันตามจังหวัด (ตะวันออกขึ้นก่อนตะวันตก)', () => {
  const at = (id) => { const p = placeById(id); return sunriseMinutes(p.lat, p.lon, 2026, 3, 15); };
  const ubon = at('ubon-ratchathani');
  const maeHongSon = at('mae-hong-son');
  assert.ok(maeHongSon - ubon >= 20 && maeHongSon - ubon <= 40, `ต่างกัน ${maeHongSon - ubon} นาที`);
  // เกิดเวลาที่อยู่ระหว่างสองเวลานี้ → อุบลฯ นับวันปฏิทิน แม่ฮ่องสอนนับเป็นวันก่อนหน้า
  const mid = Math.round((ubon + maeHongSon) / 2);
  assert.equal(thaiAstroDay({ ce: 2026, month: 3, day: 15, minutes: mid, placeId: 'ubon-ratchathani' }).shifted, false);
  assert.equal(thaiAstroDay({ ce: 2026, month: 3, day: 15, minutes: mid, placeId: 'mae-hong-son' }).shifted, true);
});

test('ข้อมูลภูมิภาคที่จำไว้จากเวอร์ชันเก่าแปลงเป็นจังหวัดที่มีอยู่จริง', () => {
  for (const id of Object.values(LEGACY_REGION_TO_PROVINCE)) assert.ok(placeById(id), id);
});
