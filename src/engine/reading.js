// สร้างผลลัพธ์เช็คดวงจากข้อมูลที่ผ่านการตรวจแล้ว
// แหล่งของผลแต่ละส่วนถูกติดป้ายไว้: 'calendar' (ปฏิทิน), 'belief' (ความเชื่อ), 'simulated' (จำลอง)
import { BE_OFFSET, ageOn, regionById, thaiAstroDay, tropicalSign, zodiacAnimal } from './calendar.js';
import { CATEGORIES, DAY_TRAITS, PHASES, READINGS, TIPS } from './content.js';
import { hashString, mulberry32, pick } from './random.js';

export const GRAPH_MAX_AGE = 84; // 7 รอบ รอบละ 12 ปี
export const ZONE_HIGH = 62;
export const ZONE_LOW = 38;

export function phaseOf(score) {
  if (score >= ZONE_HIGH) return 'tailwind';
  if (score <= ZONE_LOW) return 'slow';
  return 'steady';
}

export function seedFor(v) {
  const time = v.minutes == null ? 'na' : String(v.minutes);
  return hashString(`${v.ce}-${v.month}-${v.day}|${time}|${v.region || 'none'}`);
}

/**
 * กราฟจังหวะชีวิตแบบจำลอง: คลื่นรอบ 12 ปี + คลื่นรองที่สั้นกว่า + ความแปรผันเล็กน้อย
 * ทั้งหมดกำหนดค่าด้วย seed จากข้อมูลเกิด จึงได้กราฟเดิมทุกครั้งที่กรอกข้อมูลเดิม
 */
export function buildLifeGraph(v) {
  const rng = mulberry32(seedFor(v));
  const phase = rng() * 12;
  const amp1 = 16 + rng() * 5;
  const amp2 = 6 + rng() * 4;
  const period2 = 5 + rng() * 4;
  const phase2 = rng() * Math.PI * 2;

  const raw = [];
  for (let age = 0; age <= GRAPH_MAX_AGE; age++) {
    const base = 50
      + amp1 * Math.sin((2 * Math.PI * (age + phase)) / 12)
      + amp2 * Math.sin((2 * Math.PI * age) / period2 + phase2)
      + (rng() - 0.5) * 5;
    raw.push(base);
  }
  // ทำให้เส้นนุ่มขึ้นด้วยค่าเฉลี่ยเคลื่อนที่แบบถ่วงน้ำหนัก 5 จุด (1-2-3-2-1)
  const spread = v.minutes == null ? 15 : 10; // ไม่ทราบเวลาเกิด → ช่วงความไม่แน่นอนกว้างขึ้น
  const points = raw.map((_, i) => {
    let sum = 0;
    let wsum = 0;
    for (let k = -2; k <= 2; k++) {
      const j = i + k;
      if (j < 0 || j >= raw.length) continue;
      const w = 3 - Math.abs(k);
      sum += raw[j] * w;
      wsum += w;
    }
    const score = clamp(Math.round(sum / wsum), 8, 92);
    return {
      age: i,
      yearBE: v.yearBE + i,
      score,
      low: clamp(score - spread, 0, 100),
      high: clamp(score + spread, 0, 100),
      phase: phaseOf(score),
    };
  });
  return { points, spread };
}

/** หาช่วงต่อเนื่องที่มี phase เดียวกันรอบอายุที่กำหนด */
export function windowAround(points, age) {
  const p = points[age];
  let start = age;
  let end = age;
  while (start > 0 && points[start - 1].phase === p.phase) start--;
  while (end < points.length - 1 && points[end + 1].phase === p.phase) end++;
  return { phase: p.phase, startAge: start, endAge: end, startBE: points[start].yearBE, endBE: points[end].yearBE };
}

export function nextTailwind(points, age) {
  for (let a = age + 1; a < points.length; a++) {
    if (points[a].phase === 'tailwind' && points[a - 1].phase !== 'tailwind') return windowAround(points, a);
  }
  return null;
}

function levelBucket(level) {
  if (level <= 2) return 'low';
  if (level === 3) return 'mid';
  return 'high';
}

/**
 * @param {object} v ค่าที่ผ่าน validateBirth แล้ว
 * @param {{ce:number, month:number, day:number}} today
 */
export function buildReading(v, today) {
  const astroDay = thaiAstroDay({ ce: v.ce, month: v.month, day: v.day, minutes: v.minutes, regionId: v.region });
  const zodiac = zodiacAnimal(v.ce, v.month);
  const sign = tropicalSign(v.month, v.day);
  const graph = buildLifeGraph(v);
  const age = Math.max(0, Math.min(GRAPH_MAX_AGE, ageOn(v, today)));
  const now = graph.points[age];
  const todayBE = today.ce + BE_OFFSET;
  const seed = seedFor(v);

  const categories = CATEGORIES.map((c, idx) => {
    const rng = mulberry32(hashString(`${seed}|${c.id}|${todayBE}`));
    const offset = idx === 0 ? 0 : Math.round((rng() - 0.5) * 30);
    const value = clamp(now.score + offset, 1, 99);
    const level = Math.min(5, Math.max(1, Math.ceil(value / 20)));
    const bucket = levelBucket(level);
    const textSeed = hashString(`${seed}|${c.id}|text|${todayBE}`);
    return {
      id: c.id,
      name: c.name,
      level,
      text: pick(READINGS[c.id][bucket], textSeed),
      tip: pick(TIPS[c.id], textSeed >>> 3),
      source: 'simulated',
    };
  });

  const current = windowAround(graph.points, age);
  const region = regionById(v.region);

  return {
    input: {
      // ใช้แสดงผลบนหน้าจอผู้ใช้เท่านั้น ไม่ถูกส่งออกไปที่ใด
      yearBE: v.yearBE, month: v.month, day: v.day,
      timeKnown: v.minutes != null,
      regionLabel: region ? region.label : null,
    },
    year: todayBE,
    age,
    basics: {
      astroDay: { name: astroDay.name, color: astroDay.color, deity: astroDay.deity, notes: astroDay.notes },
      trait: DAY_TRAITS[astroDay.id],
      zodiac,
      sign,
    },
    categories,
    rhythm: {
      current,
      phaseInfo: PHASES[current.phase],
      next: nextTailwind(graph.points, age),
      nowScore: now.score,
    },
    graph,
  };
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}
