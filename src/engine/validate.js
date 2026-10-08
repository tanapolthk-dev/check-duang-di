// ตรวจสอบข้อมูลจากแบบฟอร์ม คืนค่าข้อผิดพลาดเป็นภาษาไทยที่บอกวิธีแก้
import { BE_OFFSET, MIN_YEAR_BE, THAI_MONTHS, isValidDate, parseTime, regionById } from './calendar.js';

/**
 * @param {{day?:string|number, month?:string|number, yearBE?:string|number, time?:string, timeUnknown?:boolean, region?:string}} input
 * @param {{ce:number, month:number, day:number}} today วันที่ปัจจุบัน (ส่งเข้ามาเพื่อให้ทดสอบได้)
 */
export function validateBirth(input, today) {
  const errors = {};
  const day = toInt(input.day);
  const month = toInt(input.month);
  const yearRaw = String(input.yearBE ?? '').trim();
  const yearBE = /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : null;
  const todayBE = today.ce + BE_OFFSET;

  if (!day) errors.day = 'เลือกวันที่เกิด';
  if (!month || month < 1 || month > 12) errors.month = 'เลือกเดือนเกิด';

  if (!yearRaw) {
    errors.yearBE = 'กรอกปีเกิดเป็น พ.ศ. 4 หลัก เช่น 2535';
  } else if (yearBE == null) {
    errors.yearBE = 'ปีเกิดต้องเป็นตัวเลข 4 หลัก เช่น 2535';
  } else if (yearBE >= 1900 && yearBE <= 2100) {
    errors.yearBE = `ปี ${yearBE} ดูเหมือนเป็น ค.ศ. ลองกรอกเป็น พ.ศ. ${yearBE + BE_OFFSET}`;
  } else if (yearBE < MIN_YEAR_BE) {
    errors.yearBE = `รองรับปีเกิดตั้งแต่ พ.ศ. ${MIN_YEAR_BE} เป็นต้นไป`;
  } else if (yearBE > todayBE) {
    errors.yearBE = `ปีเกิดต้องไม่เกิน พ.ศ. ${todayBE}`;
  }

  if (!errors.day && !errors.month && !errors.yearBE) {
    const ce = yearBE - BE_OFFSET;
    if (!isValidDate(ce, month, day)) {
      errors.day = `วันที่ ${day} ไม่มีในเดือน${THAI_MONTHS[month - 1]} ปี พ.ศ. ${yearBE}`;
    } else if (compare({ ce, month, day }, today) > 0) {
      errors.day = 'วันเกิดต้องไม่เป็นวันในอนาคต';
    }
  }

  const timeUnknown = Boolean(input.timeUnknown);
  let minutes = null;
  if (!timeUnknown) {
    const t = String(input.time ?? '').trim();
    if (!t) errors.time = 'กรอกเวลาเกิด หรือเลือก "ไม่ทราบเวลาเกิด"';
    else {
      minutes = parseTime(t);
      if (minutes == null) errors.time = 'เวลาไม่ถูกต้อง ใช้รูปแบบ ชั่วโมง:นาที เช่น 08:30';
    }
  }

  const region = input.region ? String(input.region) : '';
  if (region && !regionById(region)) errors.region = 'เลือกภูมิภาคจากรายการ หรือเว้นว่างไว้';

  const ok = Object.keys(errors).length === 0;
  return {
    ok,
    errors,
    value: ok ? { ce: yearBE - BE_OFFSET, yearBE, month, day, minutes, timeUnknown, region } : null,
  };
}

function toInt(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function compare(a, b) {
  return (a.ce - b.ce) || (a.month - b.month) || (a.day - b.day);
}

/** ลำดับช่องในฟอร์ม ใช้หาช่องแรกที่ผิดเพื่อย้ายโฟกัส */
export const FIELD_ORDER = ['day', 'month', 'yearBE', 'time', 'region'];
