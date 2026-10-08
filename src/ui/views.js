// มุมมองของแต่ละหน้า (คืนค่าเป็นสตริง HTML; ข้อมูลจากผู้ใช้ผ่าน esc() ทุกครั้ง)
import { ABROAD, MIN_YEAR_BE, THAI_MONTHS } from '../engine/calendar.js';
import { PROVINCES, PROVINCE_REGIONS } from '../engine/provinces.js';
import { DISCLAIMER, PHASES } from '../engine/content.js';
import { GRAPH_MAX_AGE } from '../engine/reading.js';
import { esc } from './dom.js';

const SRC_LABEL = { calendar: 'ปฏิทิน', belief: 'ความเชื่อ', simulated: 'จำลอง' };
const src = (kind) => `<span class="src src-${kind}">${SRC_LABEL[kind]}</span>`;

/* ---------- หน้าแรก ---------- */
function heroRing() {
  const cx = 200;
  const cy = 200;
  const r = 150;
  const levels = ['dim', 'mid', 'mid', 'dim', 'dim', 'mid', 'now', 'mid', 'dim', 'dim', 'mid', 'dim'];
  let segs = '';
  for (let i = 0; i < 12; i++) {
    const a0 = ((i * 30 - 90 + 1.8) * Math.PI) / 180;
    const a1 = (((i + 1) * 30 - 90 - 1.8) * Math.PI) / 180;
    const p0 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)];
    const p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
    segs += `<path class="seg seg-${levels[i]}" d="M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}A${r} ${r} 0 0 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}"/>`;
  }
  return `<svg class="hero-ring" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
    <g class="ring-rotor">${segs}</g>
    <text class="ring-center" x="200" y="198" text-anchor="middle">รอบ 12 ปี</text>
    <text class="ring-sub" x="200" y="226" text-anchor="middle">ปีนี้อยู่ช่องไหนของรอบ</text>
  </svg>`;
}

export function homeView() {
  return `
  <section class="hero" aria-labelledby="page-title">
    <div>
      <h1 id="page-title" class="hero-title" tabindex="-1">เช็คดวงดิ๊</h1>
      <p class="wordmark-en" lang="en">Check Duang Di<sup>CDD</sup></p>
      <p class="hero-lead">กรอกวันเกิด แล้วดูว่าปีนี้จังหวะชีวิตคุณเป็นแบบไหน ทั้งความรัก การงาน การเงิน และกราฟรอบ 12 ปี</p>
      <div class="actions">
        <a class="btn btn-primary" href="#/check">เริ่มเช็คดวง</a>
        <a class="btn btn-quiet" href="#/how">ระบบทำงานอย่างไร</a>
      </div>
      <p class="hero-assure">ฟรี ไม่ต้องสมัคร ข้อมูลประมวลผลบนเครื่องของคุณเท่านั้น เนื้อหาเพื่อความบันเทิงและการสำรวจตนเอง</p>
    </div>
    ${heroRing()}
  </section>
  <h2 class="visually-hidden">ขั้นตอนการใช้งาน</h2>
  <ol class="steps">
    <li><span class="step-num" aria-hidden="true">1</span><span class="step-title">กรอกวันเกิด</span><span class="step-desc">วัน เดือน ปี พ.ศ. ส่วนเวลาและสถานที่เกิดใส่หรือข้ามก็ได้</span></li>
    <li><span class="step-num" aria-hidden="true">2</span><span class="step-title">อ่านผล 5 หมวด</span><span class="step-desc">ภาพรวม ความรัก การงาน การเงิน และจังหวะชีวิต พร้อมป้ายบอกที่มา</span></li>
    <li><span class="step-num" aria-hidden="true">3</span><span class="step-title">ดูกราฟรอบ 12 ปี</span><span class="step-desc">เลื่อนดูแต่ละช่วงอายุ แล้วแชร์ผลแบบไม่เปิดเผยวันเกิด</span></li>
  </ol>`;
}

/* ---------- แบบฟอร์ม ---------- */
const FIELD_LABEL = { day: 'วันที่เกิด', month: 'เดือนเกิด', yearBE: 'ปีเกิด (พ.ศ.)', time: 'เวลาเกิด', province: 'จังหวัดที่เกิด' };
const FIELD_ID = { day: 'f-day', month: 'f-month', yearBE: 'f-year', time: 'f-time', province: 'f-province' };

export function formView(v = {}, errors = {}, { hasSaved = false } = {}) {
  const errKeys = Object.keys(errors);
  const inv = (k) => (errors[k] ? 'aria-invalid="true"' : '');
  const desc = (k, hintId) => `aria-describedby="${[hintId, `${FIELD_ID[k]}-err`].filter(Boolean).join(' ')}"`;
  const err = (k) => `<p class="err" id="${FIELD_ID[k]}-err">${esc(errors[k] || '')}</p>`;

  const dayOpts = Array.from({ length: 31 }, (_, i) => i + 1)
    .map((d) => `<option value="${d}"${String(v.day) === String(d) ? ' selected' : ''}>${d}</option>`).join('');
  const monthOpts = THAI_MONTHS
    .map((m, i) => `<option value="${i + 1}"${String(v.month) === String(i + 1) ? ' selected' : ''}>${m}</option>`).join('');
  const sel = (id) => (v.province === id ? ' selected' : '');
  const collator = new Intl.Collator('th');
  const provinceOpts = PROVINCE_REGIONS.map((reg) => {
    const items = PROVINCES.filter((p) => p.region === reg.id)
      .sort((a, b) => (a.id === 'bangkok' ? -1 : b.id === 'bangkok' ? 1 : collator.compare(a.name, b.name)))
      .map((p) => `<option value="${p.id}"${sel(p.id)}>${p.name}</option>`).join('');
    return `<optgroup label="${reg.label}">${items}</optgroup>`;
  }).join('') + `<optgroup label="อื่น ๆ"><option value="${ABROAD.id}"${sel(ABROAD.id)}>${ABROAD.name}</option></optgroup>`;

  const summary = errKeys.length
    ? `<div class="error-summary" id="error-summary" tabindex="-1" role="alert" aria-labelledby="err-title">
        <h2 id="err-title">ยังส่งข้อมูลไม่ได้ ตรวจ ${errKeys.length} จุดนี้ก่อน</h2>
        <ul>${errKeys.map((k) => `<li><a href="#${FIELD_ID[k]}" data-focus="${FIELD_ID[k]}">${FIELD_LABEL[k]}: ${esc(errors[k])}</a></li>`).join('')}</ul>
      </div>`
    : '';

  return `
  <section class="page">
    <h1 id="page-title" tabindex="-1">กรอกข้อมูลเกิด</h1>
    <p class="page-lead">ใช้แค่วันเกิดก็ดูผลได้ ข้อมูลทั้งหมดประมวลผลในเบราว์เซอร์นี้และไม่ถูกส่งออกไปที่ใด</p>
    ${summary}
    <form class="form" id="birth-form" novalidate>
      <fieldset>
        <legend>วันเกิด <span class="req">(จำเป็น)</span></legend>
        <p class="hint" id="date-hint">ใช้หาวันเกิดทางโหราศาสตร์ไทย ปีนักษัตร ราศี และเป็นฐานของกราฟจังหวะชีวิต</p>
        <div class="field-row">
          <div class="field">
            <label for="f-day">วันที่</label>
            <select id="f-day" name="day" ${inv('day')} ${desc('day', 'date-hint')} autocomplete="bday-day">
              <option value="">เลือก</option>${dayOpts}
            </select>
            ${err('day')}
          </div>
          <div class="field">
            <label for="f-month">เดือน</label>
            <select id="f-month" name="month" ${inv('month')} ${desc('month', 'date-hint')} autocomplete="bday-month">
              <option value="">เลือก</option>${monthOpts}
            </select>
            ${err('month')}
          </div>
          <div class="field f-year">
            <label for="f-year">ปี พ.ศ.</label>
            <input id="f-year" name="yearBE" type="text" inputmode="numeric" maxlength="4" placeholder="เช่น 2535"
              value="${esc(v.yearBE ?? '')}" ${inv('yearBE')} ${desc('yearBE', 'year-hint')}>
            <p class="hint small" id="year-hint">ตั้งแต่ พ.ศ. ${MIN_YEAR_BE}</p>
            ${err('yearBE')}
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>เวลาเกิด <span class="opt">(ไม่บังคับ ข้ามได้)</span></legend>
        <p class="hint" id="time-hint">ธรรมเนียมโหราศาสตร์ไทยนับวันใหม่เมื่อพระอาทิตย์ขึ้น ถ้าเกิดก่อนรุ่งเช้า วันเกิดทางโหราศาสตร์อาจเป็นวันก่อนหน้า ถ้าไม่ทราบเวลา กราฟจะแสดงช่วงความไม่แน่นอนกว้างขึ้น</p>
        <div class="time-row field">
          <label for="f-time">เวลา (ชั่วโมง:นาที)</label>
          <input id="f-time" name="time" type="time" value="${esc(v.time ?? '')}" ${v.timeUnknown ? 'disabled' : ''} ${inv('time')} ${desc('time', 'time-hint')}>
          ${err('time')}
        </div>
        <label class="check" for="f-time-unknown">
          <input id="f-time-unknown" name="timeUnknown" type="checkbox" ${v.timeUnknown ? 'checked' : ''}>
          <span>ไม่ทราบเวลาเกิด ข้ามไปก่อน</span>
        </label>
      </fieldset>

      <fieldset>
        <legend>สถานที่เกิด <span class="opt">(ไม่บังคับ)</span></legend>
        <p class="hint" id="province-hint">ใช้ประมาณเวลาพระอาทิตย์ขึ้นจากพิกัดตัวเมืองของจังหวัดที่เกิด (ไม่ต้องกรอกที่อยู่) ถ้าไม่ระบุจะใช้กรุงเทพมหานคร</p>
        <div class="field">
          <label for="f-province">จังหวัด</label>
          <select id="f-province" name="province" ${inv('province')} ${desc('province', 'province-hint')}>
            <option value="">ไม่ระบุ</option>${provinceOpts}
          </select>
          ${err('province')}
        </div>
      </fieldset>

      <div class="remember-box">
        <label class="check" for="f-remember">
          <input id="f-remember" name="remember" type="checkbox" ${hasSaved ? 'checked' : ''}>
          <span>จำข้อมูลบนเครื่องนี้ เพื่อกลับมาเช็คครั้งหน้าได้เร็วขึ้น <span class="muted small">(เก็บในเบราว์เซอร์นี้เท่านั้น ลบได้ทุกเมื่อ)</span></span>
        </label>
        <div class="actions">
          <button class="btn btn-primary" type="submit">ดูผลเช็คดวง</button>
          ${hasSaved ? '<button class="btn btn-quiet" type="button" id="forget-btn">ลบข้อมูลที่จำไว้</button>' : ''}
        </div>
        <p class="status" id="form-status" role="status"></p>
      </div>
    </form>
  </section>`;
}

/* ---------- สถานะ ---------- */
export function loadingView() {
  return `
  <section class="state" aria-busy="true">
    <svg class="state-icon spinner" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><use href="#ring-mark"/></svg>
    <h1 id="page-title" tabindex="-1">กำลังจัดเตรียมผล</h1>
    <p class="muted">ประมวลผลบนเครื่องของคุณ ไม่มีการส่งข้อมูลออกไปที่ใด</p>
  </section>`;
}

export function errorView(message) {
  return `
  <section class="state">
    <h1 id="page-title" tabindex="-1">สร้างผลลัพธ์ไม่สำเร็จ</h1>
    <p>ระบบประมวลผลข้อมูลชุดนี้ไม่สำเร็จ${message ? ` (${esc(message)})` : ''} ข้อมูลที่กรอกยังอยู่ ลองอีกครั้ง หรือกลับไปตรวจข้อมูลในฟอร์ม</p>
    <div class="actions">
      <button class="btn btn-primary" type="button" id="retry-btn">ลองอีกครั้ง</button>
      <a class="btn btn-secondary" href="#/check">กลับไปแก้ข้อมูล</a>
    </div>
  </section>`;
}

export function emptyView() {
  return `
  <section class="state">
    <svg class="state-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><use href="#ring-mark"/></svg>
    <h1 id="page-title" tabindex="-1">ยังไม่มีผลเช็คดวง</h1>
    <p>ผลลัพธ์ไม่ถูกเก็บไว้ในลิงก์หรือบนเซิร์ฟเวอร์ เมื่อโหลดหน้าใหม่ผลจึงหายไป กรอกวันเกิดเพื่อดูผลอีกครั้ง ใช้เวลาไม่ถึงนาที</p>
    <div class="actions"><a class="btn btn-primary" href="#/check">กรอกวันเกิด</a></div>
  </section>`;
}

/* ---------- ผลลัพธ์ ---------- */
function meter(level) {
  const dots = Array.from({ length: 5 }, (_, i) => `<span class="${i < level ? 'on' : ''}"></span>`).join('');
  return `<div class="meter"><div class="meter-dots" aria-hidden="true">${dots}</div><span class="meter-label">ระดับจำลอง ${level} จาก 5</span></div>`;
}

export function exploreText(p) {
  const ph = PHASES[p.phase];
  return `อายุ ${p.age} ปี (พ.ศ. ${p.yearBE}): ${ph.name} ระดับจำลอง ${p.score} จาก 100 ช่วงความไม่แน่นอน ${p.low}–${p.high}`;
}

export function shareText(reading, publicUrl) {
  const ph = reading.rhythm.phaseInfo.name;
  const lines = [
    `ปี ${reading.year} จังหวะชีวิตของฉันอยู่ใน "${ph}" จากเช็คดวงดิ๊ (เนื้อหาเพื่อความบันเทิง)`,
  ];
  if (publicUrl) lines.push(`ลองเช็คของคุณ: ${publicUrl}`);
  return lines.join('\n');
}

export function resultView(r, { publicUrl, canShare }) {
  const b = r.basics;
  const rh = r.rhythm;
  const timeNote = r.input.timeKnown ? 'ระบุเวลาเกิด' : 'ไม่ระบุเวลาเกิด';
  const placeNote = r.input.placeLabel ? `เกิด${r.input.placeLabel}` : 'ไม่ระบุสถานที่เกิด';
  const notes = [...b.astroDay.notes, b.zodiac.note].filter(Boolean);
  const nextText = rh.next
    ? `ช่วงลมส่งถัดไปในแบบจำลองเริ่มราว พ.ศ. ${rh.next.startBE} (อายุ ${rh.next.startAge} ปี)`
    : 'ในแบบจำลองไม่พบช่วงลมส่งถัดไปภายในช่วงอายุของกราฟ';

  const cats = r.categories.map((c) => `
    <section class="panel" id="cat-${c.id}" aria-labelledby="h-${c.id}">
      <h2 id="h-${c.id}">${c.name} ${src('simulated')}</h2>
      ${meter(c.level)}
      <p>${esc(c.text)}</p>
      <p class="tip"><strong>ลองทำดู:</strong> ${esc(c.tip)}</p>
    </section>`).join('');

  const rows = r.graph.points.map((p) => `<tr${p.age === r.age ? ' aria-current="true"' : ''}><td>${p.age}</td><td>${p.yearBE}</td><td>${PHASES[p.phase].short}</td><td>${p.score}</td><td>${p.low}–${p.high}</td></tr>`).join('');

  const share = shareText(r, publicUrl);

  return `
  <div class="result-head">
    <h1 id="page-title" tabindex="-1">ผลเช็คดวงของคุณ ปี ${r.year}</h1>
    <p class="result-meta"><span>อายุ ${r.age} ปี</span><span>${timeNote}</span><span>${placeNote}</span></p>
    <p class="small muted">ป้ายบอกที่มา: ${src('calendar')} คำนวณจากปฏิทิน ${src('belief')} ความเชื่อหรือธรรมเนียม ${src('simulated')} เนื้อหาจำลองเพื่อความบันเทิง</p>
    <nav aria-label="ไปยังหมวด">
      <ul class="jump">
        <li><a href="#cat-basics" data-jump="cat-basics">พื้นดวง</a></li>
        ${r.categories.map((c) => `<li><a href="#cat-${c.id}" data-jump="cat-${c.id}">${c.name}</a></li>`).join('')}
        <li><a href="#cat-rhythm" data-jump="cat-rhythm">จังหวะชีวิต</a></li>
        <li><a href="#share" data-jump="share">แชร์</a></li>
      </ul>
    </nav>
  </div>

  <section class="panel" id="cat-basics" aria-labelledby="h-basics">
    <h2 id="h-basics">พื้นดวงจากวันเกิด</h2>
    <dl class="basics">
      <div><dt>วันเกิดทางโหราศาสตร์ไทย ${src('calendar')}</dt><dd>วัน${esc(b.astroDay.name)}</dd></div>
      <div><dt>สีประจำวันเกิด ${src('belief')}</dt><dd>${esc(b.astroDay.color)}</dd></div>
      <div><dt>ปีนักษัตร ${src('calendar')}</dt><dd>ปี${esc(b.zodiac.animal)}</dd></div>
      <div><dt>ราศีแบบสากล (Tropical) ${src('calendar')}</dt><dd>ราศี${esc(b.sign)}</dd></div>
    </dl>
    <p>${esc(b.trait)} ${src('belief')}</p>
    ${notes.length ? `<ul class="note-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    <p class="small muted">ราศีในโหราศาสตร์ไทยใช้ระบบนิรายนะ ซึ่งมักต่างจากราศีแบบสากลประมาณหนึ่งราศี</p>
  </section>

  ${cats}

  <section class="panel" id="cat-rhythm" aria-labelledby="h-rhythm">
    <h2 id="h-rhythm">จังหวะชีวิต ${src('simulated')}</h2>
    <div class="rhythm-now">
      <span class="phase-chip phase-${rh.current.phase}">${rh.phaseInfo.short}</span>
      <strong>ตอนนี้อยู่ใน${rh.phaseInfo.name} (อายุ ${rh.current.startAge}–${rh.current.endAge} ปี ในแบบจำลอง)</strong>
      <span class="muted">${rh.phaseInfo.desc}</span>
    </div>
    <p>${nextText}</p>
    <ul class="legend" aria-label="คำอธิบายกราฟ">
      <li><span class="sw sw-line" aria-hidden="true"></span>ระดับพลังจำลอง (0–100)</li>
      <li><span class="sw sw-band" aria-hidden="true"></span>ช่วงความไม่แน่นอน ±${r.graph.spread}</li>
      <li><span class="sw sw-now" aria-hidden="true"></span>ปีปัจจุบัน</li>
      <li>แกนนอนคืออายุ (ปี) เส้นแบ่งทุก 12 ปี</li>
    </ul>
    <div class="chart-wrap" id="chart"></div>
    <div class="explore">
      <label for="age-range">เลื่อนดูแต่ละช่วงอายุ</label>
      <input id="age-range" type="range" min="0" max="${GRAPH_MAX_AGE}" step="1" value="${r.age}" aria-describedby="age-out">
      <output id="age-out" class="explore-out" for="age-range">${esc(exploreText(r.graph.points[r.age]))}</output>
    </div>
    <div class="notice">
      <p>กราฟนี้สร้างจากแบบจำลองที่ทีม Vanij ออกแบบเอง (คลื่นรอบ 12 ปีบวกความแปรผันที่กำหนดด้วยข้อมูลเกิด) <strong>ไม่ใช่การคำนวณตามตำราโหราศาสตร์ใด</strong> และไม่ได้บอกว่าจะเกิดอะไรขึ้นจริง ใช้เป็นจุดตั้งต้นในการทบทวนตัวเองเท่านั้น</p>
    </div>
    <details>
      <summary>ดูตัวเลขทุกปีในรูปตาราง</summary>
      <div class="table-scroll">
        <table class="data">
          <caption class="visually-hidden">ระดับพลังจำลองรายปี</caption>
          <thead><tr><th scope="col">อายุ</th><th scope="col">พ.ศ.</th><th scope="col">ช่วง</th><th scope="col">ระดับ</th><th scope="col">ช่วงไม่แน่นอน</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </details>
  </section>

  <section class="panel" id="share" aria-labelledby="h-share">
    <h2 id="h-share">แชร์ผลแบบไม่เปิดเผยข้อมูลส่วนตัว</h2>
    <p>ข้อความที่จะแชร์มีแค่ชื่อช่วงจังหวะชีวิตปีนี้ ไม่มีวันเกิด เวลาเกิด หรือสถานที่เกิด</p>
    <div class="share-preview" id="share-text">${esc(share)}</div>
    <div class="actions">
      ${canShare ? '<button class="btn btn-primary" type="button" id="share-btn">แชร์</button>' : ''}
      <button class="btn ${canShare ? 'btn-secondary' : 'btn-primary'}" type="button" id="copy-share-btn">คัดลอกข้อความ</button>
    </div>
    <p class="status" id="share-status" role="status"></p>
    ${publicUrl ? '' : '<p class="small muted">ลิงก์เว็บแอปจะถูกใส่ในข้อความแชร์เมื่อเว็บเผยแพร่ด้วย URL จริงแล้ว</p>'}
  </section>

  <div class="notice measure"><p>${esc(DISCLAIMER)}</p></div>
  <div class="actions">
    <a class="btn btn-secondary" href="#/check">เช็คใหม่</a>
    <a class="btn btn-quiet" href="#/how">อ่านหลักการทำงาน</a>
  </div>`;
}

/* ---------- หลักการทำงาน ---------- */
export function howView() {
  return `
  <article class="page prose">
    <h1 id="page-title" tabindex="-1">หลักการทำงานและข้อจำกัด</h1>
    <p class="page-lead">เช็คดวงดิ๊เป็นต้นแบบเพื่อความบันเทิง เราบอกให้ชัดว่าแต่ละผลมาจากไหน เพื่อให้คุณใช้วิจารณญาณได้เต็มที่</p>

    <h2>จากวันเกิดถึงผลลัพธ์</h2>
    <ol>
      <li>คุณกรอกวันเกิด (จำเป็น) เวลาเกิดและจังหวัดที่เกิด (ไม่บังคับ)</li>
      <li>เบราว์เซอร์ตรวจความถูกต้อง เช่น วันที่มีจริงไหม เป็นปี พ.ศ. หรือไม่ และไม่เป็นวันในอนาคต</li>
      <li>คำนวณข้อมูลจากปฏิทิน: วันในสัปดาห์ เวลาพระอาทิตย์ขึ้นโดยประมาณ ปีนักษัตร และราศีแบบสากล</li>
      <li>สร้างค่าตั้งต้นจากข้อมูลเกิด (hash) แล้วใช้สร้างกราฟจำลองและเลือกข้อความ ข้อมูลชุดเดิมจึงได้ผลเดิมเสมอภายในปีเดียวกัน</li>
      <li>แสดงผลบนหน้าจอ ผลจะหายไปเมื่อปิดหรือโหลดหน้าใหม่ เว้นแต่คุณเลือกให้จำข้อมูลฟอร์มไว้บนเครื่องนี้</li>
    </ol>

    <h2>สามประเภทของผลลัพธ์</h2>
    <div class="table-scroll"><table class="data">
      <thead><tr><th scope="col">ป้าย</th><th scope="col">ความหมาย</th><th scope="col">ตัวอย่าง</th></tr></thead>
      <tbody>
        <tr><td>${src('calendar')}</td><td>คำนวณจากปฏิทินด้วยกฎที่ระบุชัด ตรวจสอบซ้ำได้</td><td>วันในสัปดาห์ ปีนักษัตร ราศีแบบสากล เวลาพระอาทิตย์ขึ้นโดยประมาณ</td></tr>
        <tr><td>${src('belief')}</td><td>ธรรมเนียมหรือความเชื่อที่แพร่หลาย ไม่ได้พิสูจน์ทางวิทยาศาสตร์</td><td>สีประจำวันเกิด ลักษณะนิสัยตามวันเกิด การนับวันใหม่ตอนรุ่งเช้า</td></tr>
        <tr><td>${src('simulated')}</td><td>สร้างโดยแบบจำลองของเช็คดวงดิ๊เพื่อความบันเทิง</td><td>ระดับ 1–5 ของแต่ละหมวด ข้อความคำทำนาย กราฟจังหวะชีวิต</td></tr>
      </tbody>
    </table></div>

    <h2>กราฟจังหวะชีวิตสร้างอย่างไร</h2>
    <p>เส้นกราฟคือผลรวมของคลื่นรอบ 12 ปี คลื่นรองที่สั้นกว่า และความแปรผันเล็กน้อย โดยตำแหน่งเริ่มของคลื่นกำหนดจากข้อมูลเกิด แล้วเกลี่ยให้นุ่มขึ้น ค่าที่ 62 ขึ้นไปเรียกว่าช่วงลมส่ง 38 ลงมาเรียกว่าช่วงชะลอ ที่เหลือคือช่วงเก็บแรง แถบจางรอบเส้นคือช่วงความไม่แน่นอน ซึ่งกว้างขึ้นเมื่อไม่ทราบเวลาเกิด</p>
    <p>แบบจำลองนี้ <strong>ไม่ได้</strong> ใช้ตำรากราฟชีวิตหรือหลักเลข 12 ตัวแบบดั้งเดิม เพราะเรายังไม่ได้ตรวจสอบสูตรเหล่านั้นกับผู้เชี่ยวชาญ</p>

    <h2>สมมติฐานที่ใช้</h2>
    <ul>
      <li>เวลาเกิดเป็นเวลามาตรฐานประเทศไทย (UTC+7)</li>
      <li>เวลาพระอาทิตย์ขึ้นคำนวณจากพิกัดตัวเมืองของจังหวัด อาจคลาดจากสถานที่เกิดจริงไม่กี่นาที</li>
      <li>พุธกลางคืนนับตั้งแต่ 18:00 จนก่อนพระอาทิตย์ขึ้น</li>
      <li>ปีนักษัตรนับตามปีปฏิทิน (บางธรรมเนียมเปลี่ยนเมื่อขึ้นปีใหม่จีนหรือไทย)</li>
      <li>กราฟครอบคลุมอายุ 0–${GRAPH_MAX_AGE} ปี (7 รอบ รอบละ 12 ปี)</li>
    </ul>

    <h2>ข้อจำกัด</h2>
    <ul>
      <li>ผลลัพธ์ไม่ใช่การพยากรณ์ที่พิสูจน์ได้ และไม่ควรใช้ตัดสินใจเรื่องสุขภาพ การเงิน กฎหมาย หรือเรื่องสำคัญในชีวิต</li>
      <li>เกิดต่างประเทศ: ระบบยังไม่ปรับเวลาพระอาทิตย์ขึ้นตามสถานที่จริง</li>
      <li>ข้อความแต่ละหมวดมาจากคลังข้อความจำนวนจำกัด คนต่างกันอาจได้ข้อความเหมือนกัน</li>
    </ul>
    <div class="actions"><a class="btn btn-primary" href="#/check">เริ่มเช็คดวง</a></div>
  </article>`;
}

/* ---------- ความเป็นส่วนตัว ---------- */
export function privacyView({ hasSaved }) {
  return `
  <article class="page prose">
    <h1 id="page-title" tabindex="-1">ความเป็นส่วนตัวและการใช้ข้อมูล</h1>
    <p class="page-lead">สรุปสั้น ๆ: ข้อมูลเกิดของคุณถูกประมวลผลในเบราว์เซอร์นี้ ไม่ถูกส่งไปเซิร์ฟเวอร์ของเรา และเราไม่มีระบบเก็บข้อมูลผู้ใช้</p>

    <div class="table-scroll"><table class="data">
      <thead><tr><th scope="col">ข้อมูล</th><th scope="col">ใช้ทำอะไร</th><th scope="col">เก็บที่ไหน นานแค่ไหน</th></tr></thead>
      <tbody>
        <tr><td>วัน เดือน ปีเกิด</td><td>คำนวณพื้นดวงและกราฟ</td><td>ในหน่วยความจำของแท็บนี้ หายเมื่อปิดหรือโหลดหน้าใหม่</td></tr>
        <tr><td>เวลาเกิด (ถ้ากรอก)</td><td>ปรับวันเกิดตามเวลาพระอาทิตย์ขึ้น และกำหนดความกว้างช่วงไม่แน่นอน</td><td>เหมือนข้างบน</td></tr>
        <tr><td>จังหวัดที่เกิด (ถ้าเลือก)</td><td>ประมาณเวลาพระอาทิตย์ขึ้น</td><td>เหมือนข้างบน</td></tr>
        <tr><td>ข้อมูลฟอร์มที่เลือก "จำไว้"</td><td>เติมฟอร์มให้อัตโนมัติครั้งหน้า</td><td>localStorage ของเบราว์เซอร์นี้บนเครื่องนี้ จนกว่าคุณจะลบ</td></tr>
      </tbody>
    </table></div>

    <h2>สิ่งที่เราไม่ทำ</h2>
    <ul>
      <li>ไม่มีบัญชีผู้ใช้ ไม่ขอชื่อ อีเมล หรือเบอร์โทร</li>
      <li>ไม่มีเซิร์ฟเวอร์รับข้อมูล ไม่มีฐานข้อมูล และไม่เก็บข้อมูลผู้ใช้ใน GitHub</li>
      <li>ไม่ใช้คุกกี้ ไม่มีโฆษณา ไม่มีเครื่องมือติดตามหรือวิเคราะห์สถิติ</li>
      <li>ไม่ใส่วันเกิดลงในลิงก์ ข้อความแชร์จึงไม่เปิดเผยข้อมูลเกิด</li>
      <li>ฟอนต์และสคริปต์ทั้งหมดโหลดจากเว็บนี้เอง และหน้าเว็บตั้งค่า Content-Security-Policy ห้ามสคริปต์เชื่อมต่อเครือข่ายออกไปข้างนอก</li>
    </ul>

    <h2>ผู้ให้บริการโฮสต์เว็บ</h2>
    <p>เมื่อคุณเปิดเว็บ ผู้ให้บริการโฮสต์ (เช่น GitHub Pages) จะเห็นข้อมูลการเชื่อมต่อทั่วไปอย่าง IP address และชนิดเบราว์เซอร์ตามนโยบายของผู้ให้บริการนั้น ข้อมูลนี้ไม่รวมสิ่งที่คุณกรอกในฟอร์ม</p>

    <h2>ลบข้อมูลที่จำไว้</h2>
    <p id="saved-state">${hasSaved ? 'ตอนนี้มีข้อมูลฟอร์มที่จำไว้บนเครื่องนี้' : 'ตอนนี้ไม่มีข้อมูลที่จำไว้บนเครื่องนี้'}</p>
    <div class="actions">
      <button class="btn btn-secondary" type="button" id="forget-btn" ${hasSaved ? '' : 'disabled'}>ลบข้อมูลที่จำไว้</button>
    </div>
    <p class="status" id="privacy-status" role="status"></p>
    <p class="small muted">ล้างข้อมูลเว็บไซต์ (site data) ในการตั้งค่าเบราว์เซอร์ก็ลบได้เช่นกัน</p>
  </article>`;
}

/* ---------- เปิดบนมือถือ ---------- */
export function openView({ publicUrl, qr }) {
  if (!publicUrl) {
    return `
    <article class="page prose">
      <h1 id="page-title" tabindex="-1">เปิดบนมือถือ</h1>
      <p class="page-lead">ยังไม่มี URL สาธารณะของเว็บแอปนี้ จึงยังไม่แสดงลิงก์และ QR code</p>
      <div class="notice"><p>เราไม่สร้าง QR code ไปยัง URL ที่ยังไม่มีอยู่จริง เพื่อไม่ให้ผู้สแกนเปิดลิงก์ผิด</p></div>
      <h2>สำหรับผู้ดูแลเว็บ: เปิดใช้หลัง deploy</h2>
      <ol>
        <li>Deploy เว็บแอป (ดูขั้นตอนใน README หัวข้อ Deploy)</li>
        <li>เปิด URL ที่ได้ แล้วตรวจว่าเว็บทำงาน</li>
        <li>ถ้าโฮสต์บน <code>*.github.io</code> หน้านี้จะแสดง QR ให้อัตโนมัติ ถ้าใช้โดเมนอื่น ให้ใส่ URL ใน <code>src/config.js</code> ที่ค่า <code>publicUrl</code> แล้ว deploy ใหม่</li>
        <li>สแกน QR ด้วยมือถืออย่างน้อย 2 เครื่องเพื่อยืนยันว่าเปิดถูกหน้า</li>
      </ol>
    </article>`;
  }
  return `
  <article class="page">
    <h1 id="page-title" tabindex="-1">เปิดบนมือถือ</h1>
    <p class="page-lead">สแกน QR code หรือคัดลอกลิงก์ไปส่งต่อ ใช้งานฟรี ไม่ต้องสมัคร</p>
    <div class="qr-box">${qr}</div>
    <div class="url-row">
      <code id="public-url">${esc(publicUrl)}</code>
      <button class="btn btn-primary" type="button" id="copy-url-btn">คัดลอกลิงก์</button>
    </div>
    <p class="status" id="url-status" role="status"></p>
  </article>`;
}

export function notFoundView() {
  return `
  <section class="state">
    <h1 id="page-title" tabindex="-1">ไม่พบหน้านี้</h1>
    <p>ลิงก์นี้ไม่มีอยู่ในเช็คดวงดิ๊ ลองกลับไปที่หน้าแรก</p>
    <div class="actions"><a class="btn btn-primary" href="#/">กลับหน้าแรก</a></div>
  </section>`;
}
