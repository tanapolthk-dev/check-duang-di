// จุดเริ่มต้นของแอป: routing, state และการผูก event
import { buildReading } from './engine/reading.js';
import { FIELD_ORDER, validateBirth } from './engine/validate.js';
import { lifeGraphSvg } from './ui/chart.js';
import { $, $$, announce, copyText, delay, prefersReducedMotion } from './ui/dom.js';
import { getPublicUrl, qrSvg } from './ui/link.js';
import { clearRemembered, hasRemembered, loadRemembered, saveRemembered } from './ui/storage.js';
import {
  emptyView, errorView, exploreText, formView, homeView, howView, loadingView,
  notFoundView, openView, privacyView, resultView, shareText,
} from './ui/views.js';

const MIN_LOADING_MS = 450;

// state อยู่ในหน่วยความจำของแท็บนี้เท่านั้น
const state = {
  draft: null,        // ค่าที่ผู้ใช้กรอกล่าสุด (ใช้เติมฟอร์มกลับเมื่อมีข้อผิดพลาด)
  errors: {},
  value: null,        // ค่าที่ผ่านการตรวจแล้ว
  status: 'idle',     // idle | loading | ready | error
  reading: null,
  errorMessage: '',
};

const TITLES = {
  '/': 'เช็คดวงดิ๊ — เช็คดวงจากวันเกิด โดย Vanij',
  '/check': 'กรอกข้อมูลเกิด — เช็คดวงดิ๊',
  '/result': 'ผลเช็คดวง — เช็คดวงดิ๊',
  '/how': 'หลักการทำงาน — เช็คดวงดิ๊',
  '/privacy': 'ความเป็นส่วนตัว — เช็คดวงดิ๊',
  '/open': 'เปิดบนมือถือ — เช็คดวงดิ๊',
};

function todayParts(d = new Date()) {
  return { ce: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function currentPath() {
  const h = window.location.hash || '#/';
  return h.startsWith('#/') ? h.slice(1).split('?')[0] : null;
}

function render({ focus = true } = {}) {
  const path = currentPath() ?? '/';
  const app = $('#app');
  const route = ROUTES[path] || notFound;
  route(app);
  document.title = TITLES[path] || 'ไม่พบหน้า — เช็คดวงดิ๊';
  $$('.site-nav a').forEach((a) => {
    if (a.getAttribute('href') === `#${path}`) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  if (focus) focusTitle();
}

function focusTitle() {
  const target = $('#error-summary') || $('#page-title');
  window.scrollTo(0, 0);
  if (target) target.focus({ preventScroll: true });
}

/* ---------- หน้าต่าง ๆ ---------- */
const ROUTES = {
  '/': (app) => { app.innerHTML = homeView(); },
  '/check': renderForm,
  '/result': renderResult,
  '/how': (app) => { app.innerHTML = howView(); },
  '/privacy': renderPrivacy,
  '/open': renderOpen,
};

function notFound(app) { app.innerHTML = notFoundView(); }

function renderForm(app) {
  const saved = loadRemembered();
  const draft = state.draft || saved || {};
  app.innerHTML = formView(draft, state.errors, { hasSaved: Boolean(saved) });
  const form = $('#birth-form');
  const timeInput = $('#f-time');
  const unknown = $('#f-time-unknown');
  unknown.addEventListener('change', () => {
    timeInput.disabled = unknown.checked;
    if (unknown.checked) {
      timeInput.removeAttribute('aria-invalid');
      $('#f-time-err').textContent = '';
    }
  });
  form.addEventListener('submit', onSubmit);
  const forget = $('#forget-btn');
  if (forget) {
    forget.addEventListener('click', () => {
      clearRemembered();
      $('#f-remember').checked = false;
      forget.remove();
      $('#form-status').textContent = 'ลบข้อมูลที่จำไว้บนเครื่องนี้แล้ว';
    });
  }
}

function readForm(form) {
  const fd = new FormData(form);
  return {
    day: fd.get('day') || '',
    month: fd.get('month') || '',
    yearBE: (fd.get('yearBE') || '').toString().trim(),
    time: $('#f-time').disabled ? '' : (fd.get('time') || ''),
    timeUnknown: $('#f-time-unknown').checked,
    region: fd.get('region') || '',
  };
}

async function onSubmit(ev) {
  ev.preventDefault();
  const form = ev.currentTarget;
  const input = readForm(form);
  const remember = $('#f-remember').checked;
  const result = validateBirth(input, todayParts());
  state.draft = input;

  if (!result.ok) {
    state.errors = result.errors;
    renderForm($('#app'));
    const first = FIELD_ORDER.find((k) => result.errors[k]);
    announce(`พบข้อมูลที่ต้องแก้ ${Object.keys(result.errors).length} จุด`);
    const summary = $('#error-summary');
    if (summary) summary.focus();
    else if (first) $(`[name="${first}"]`)?.focus();
    return;
  }

  state.errors = {};
  if (remember) saveRemembered(input);
  else clearRemembered();
  state.value = result.value;
  await compute(true);
}

async function compute(navigate) {
  state.status = 'loading';
  state.reading = null;
  state.errorMessage = '';
  if (navigate && currentPath() !== '/result') window.location.hash = '#/result';
  else render();
  announce('กำลังจัดเตรียมผล');
  try {
    const [reading] = await Promise.all([
      Promise.resolve().then(() => {
        // จุดสำหรับทดสอบสถานะผิดพลาด (ใช้ในชุดทดสอบอัตโนมัติเท่านั้น)
        if (window.__CDD_FORCE_ERROR__) throw new Error('ข้อผิดพลาดจำลองสำหรับการทดสอบ');
        return buildReading(state.value, todayParts());
      }),
      delay(prefersReducedMotion() ? 150 : MIN_LOADING_MS),
    ]);
    state.reading = reading;
    state.status = 'ready';
    announce('ผลเช็คดวงพร้อมแล้ว');
  } catch (err) {
    state.status = 'error';
    state.errorMessage = err && err.message ? err.message : '';
    announce('สร้างผลลัพธ์ไม่สำเร็จ');
  }
  if (currentPath() === '/result') render();
}

let resizeObs = null;

function renderResult(app) {
  if (resizeObs) { resizeObs.disconnect(); resizeObs = null; }
  if (state.status === 'loading') { app.innerHTML = loadingView(); return; }
  if (state.status === 'error') {
    app.innerHTML = errorView(state.errorMessage);
    $('#retry-btn').addEventListener('click', () => { window.__CDD_FORCE_ERROR__ = false; compute(false); });
    return;
  }
  if (state.status !== 'ready' || !state.reading) { app.innerHTML = emptyView(); return; }

  const r = state.reading;
  const publicUrl = getPublicUrl();
  const canShare = typeof navigator.share === 'function';
  app.innerHTML = resultView(r, { publicUrl, canShare });

  const chartBox = $('#chart');
  const range = $('#age-range');
  const out = $('#age-out');
  const draw = () => {
    chartBox.innerHTML = lifeGraphSvg(r.graph, { width: chartBox.clientWidth || 640, nowAge: r.age, selAge: Number(range.value) });
  };
  draw();
  range.addEventListener('input', () => {
    out.textContent = exploreText(r.graph.points[Number(range.value)]);
    draw();
  });
  if ('ResizeObserver' in window) {
    let last = chartBox.clientWidth;
    resizeObs = new ResizeObserver(() => {
      if (Math.abs(chartBox.clientWidth - last) > 4) { last = chartBox.clientWidth; draw(); }
    });
    resizeObs.observe(chartBox);
  }

  const text = shareText(r, publicUrl);
  const status = $('#share-status');
  $('#copy-share-btn').addEventListener('click', async () => {
    const ok = await copyText(text);
    status.textContent = ok ? 'คัดลอกข้อความแล้ว วางในแอปที่ต้องการได้เลย' : 'คัดลอกอัตโนมัติไม่ได้ เลือกข้อความในกรอบด้านบนแล้วคัดลอกเอง';
  });
  const shareBtn = $('#share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      try {
        await navigator.share({ title: 'เช็คดวงดิ๊', text });
        status.textContent = 'ส่งต่อเรียบร้อย';
      } catch (err) {
        if (err && err.name === 'AbortError') status.textContent = 'ยกเลิกการแชร์แล้ว';
        else status.textContent = 'แชร์ไม่สำเร็จ ลองใช้ปุ่มคัดลอกข้อความแทน';
      }
    });
  }
}

function renderPrivacy(app) {
  app.innerHTML = privacyView({ hasSaved: hasRemembered() });
  const btn = $('#forget-btn');
  btn.addEventListener('click', () => {
    const ok = clearRemembered();
    state.draft = null;
    $('#privacy-status').textContent = ok ? 'ลบข้อมูลที่จำไว้บนเครื่องนี้แล้ว' : 'ลบไม่สำเร็จ ลองล้างข้อมูลเว็บไซต์ในการตั้งค่าเบราว์เซอร์';
    $('#saved-state').textContent = 'ตอนนี้ไม่มีข้อมูลที่จำไว้บนเครื่องนี้';
    btn.disabled = true;
  });
}

function renderOpen(app) {
  const publicUrl = getPublicUrl();
  const qr = publicUrl ? qrSvg(publicUrl, `QR code สำหรับเปิด ${publicUrl}`) : '';
  app.innerHTML = openView({ publicUrl, qr });
  const btn = $('#copy-url-btn');
  if (btn) {
    btn.addEventListener('click', async () => {
      const ok = await copyText(publicUrl);
      $('#url-status').textContent = ok ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกอัตโนมัติไม่ได้ เลือกลิงก์ด้านบนแล้วคัดลอกเอง';
    });
  }
}

/* ---------- ลิงก์ภายในหน้า (ไม่เปลี่ยน route) ---------- */
document.addEventListener('click', (ev) => {
  const a = ev.target.closest('a[href^="#"]');
  if (!a) return;
  const href = a.getAttribute('href');
  if (href.startsWith('#/')) return; // ปล่อยให้ router จัดการ
  ev.preventDefault();
  const target = document.getElementById(href.slice(1));
  if (!target) return;
  target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  if (!target.hasAttribute('tabindex') && !/^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(target.tagName)) {
    target.setAttribute('tabindex', '-1');
  }
  target.focus({ preventScroll: true });
});

window.addEventListener('hashchange', () => {
  if (currentPath() === null) return; // ลิงก์แบบ #id ที่หลุดมา ไม่ต้องเปลี่ยนหน้า
  if (currentPath() === '/check') state.errors = {};
  render();
});

if (!window.location.hash) window.history.replaceState(null, '', '#/');
render({ focus: false });
