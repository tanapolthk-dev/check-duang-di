// กราฟจังหวะชีวิต — SVG วาดเอง ปรับขนาดตามความกว้างของกล่อง
import { GRAPH_MAX_AGE, ZONE_HIGH, ZONE_LOW } from '../engine/reading.js';
import { PHASES } from '../engine/content.js';

/**
 * @param {{points:Array}} graph
 * @param {{width:number, nowAge:number, selAge:number}} opts
 */
export function lifeGraphSvg(graph, { width, nowAge, selAge }) {
  const W = Math.max(300, Math.round(width));
  const H = W < 520 ? 250 : 300;
  const pl = 8;
  const pr = W < 520 ? 58 : 70;
  const pt = 28;
  const pb = 30;
  const iw = W - pl - pr;
  const ih = H - pt - pb;
  const x = (age) => pl + (age / GRAPH_MAX_AGE) * iw;
  const y = (v) => pt + (1 - v / 100) * ih;
  const f = (n) => n.toFixed(1);
  const pts = graph.points;

  const band = pts.map((p) => `${f(x(p.age))},${f(y(p.high))}`)
    .concat(pts.slice().reverse().map((p) => `${f(x(p.age))},${f(y(p.low))}`)).join(' ');
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${f(x(p.age))} ${f(y(p.score))}`).join('');

  let grid = '';
  for (let a = 0; a <= GRAPH_MAX_AGE; a += 12) {
    grid += `<line class="chart-grid" x1="${f(x(a))}" x2="${f(x(a))}" y1="${pt}" y2="${pt + ih}"/>`;
    grid += `<text class="chart-text" x="${f(x(a))}" y="${H - 8}" text-anchor="${a === 0 ? 'start' : 'middle'}">${a}</text>`;
  }

  const now = pts[nowAge];
  const sel = pts[selAge];
  const nowX = x(now.age);
  const nowLabelAnchor = nowX > W - pr - 30 ? 'end' : nowX < 40 ? 'start' : 'middle';

  const zoneLabelX = W - pr + 8;
  const yHi = y((100 + ZONE_HIGH) / 2);
  const yMid = y((ZONE_HIGH + ZONE_LOW) / 2);
  const yLo = y(ZONE_LOW / 2);

  const selMarker = selAge !== nowAge
    ? `<circle class="chart-sel" cx="${f(x(sel.age))}" cy="${f(y(sel.score))}" r="6"/>`
    : '';

  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="g-title g-desc">
  <title id="g-title">กราฟจังหวะชีวิตแบบจำลอง อายุ 0 ถึง ${GRAPH_MAX_AGE} ปี</title>
  <desc id="g-desc">เส้นแสดงระดับพลังจำลองรายปี แถบจางรอบเส้นคือช่วงความไม่แน่นอน ปัจจุบันอายุ ${now.age} ปี อยู่ใน${PHASES[now.phase].name} ระดับจำลอง ${now.score} จาก 100 ดูตัวเลขทุกปีได้ในตารางใต้กราฟ</desc>
  <rect class="zone-tailwind" x="${pl}" y="${f(y(100))}" width="${f(iw)}" height="${f(y(ZONE_HIGH) - y(100))}"/>
  <rect class="zone-slow" x="${pl}" y="${f(y(ZONE_LOW))}" width="${f(iw)}" height="${f(y(0) - y(ZONE_LOW))}"/>
  ${grid}
  <polygon class="chart-band" points="${band}"/>
  <path class="chart-line" d="${line}"/>
  <line class="chart-now-line" x1="${f(nowX)}" x2="${f(nowX)}" y1="${pt - 6}" y2="${pt + ih}"/>
  <text class="chart-now-label" x="${f(nowX)}" y="${pt - 10}" text-anchor="${nowLabelAnchor}">ตอนนี้</text>
  ${selMarker}
  <circle class="chart-now" cx="${f(nowX)}" cy="${f(y(now.score))}" r="7"/>
  <text class="chart-zone-label zone-label-tailwind" x="${zoneLabelX}" y="${f(yHi + 4)}">${PHASES.tailwind.short}</text>
  <text class="chart-zone-label zone-label-steady" x="${zoneLabelX}" y="${f(yMid + 4)}">${PHASES.steady.short}</text>
  <text class="chart-zone-label zone-label-slow" x="${zoneLabelX}" y="${f(yLo + 4)}">${PHASES.slow.short}</text>
</svg>`;
}
