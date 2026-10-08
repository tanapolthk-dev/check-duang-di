"""สร้างเอกสารชุดโปรโมต (docs/07-social-promo-kit.md) และหน้ารวมลิงก์แบบไฟล์เดียว (dist/promo-kit.html)
จากเนื้อหาใน marketing/promo_content.py และลิงก์ใน marketing/links.json

วิธีใช้:  node scripts/make-promo-links.mjs && python3 scripts/render-promo.py && python3 scripts/build-promo-kit.py
"""
import base64
import html
import io
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(ROOT, 'marketing'))
from promo_content import PLATFORMS, QUOTES, VIDEO_SCRIPT  # noqa: E402

LINKS = {l['id']: l for l in json.load(open(os.path.join(ROOT, 'marketing', 'links.json'), encoding='utf-8'))}
MAIN = LINKS['main']['url']


def fill(text, pid):
    return text.replace('{link}', LINKS[pid]['url'])


# ---------------------------------------------------------------- Markdown
def build_markdown():
    out = ['# 07 · ชุดโปรโมตโซเชียลมีเดีย พร้อมลิงก์และ QR', '',
           'ใช้คู่กับแผนคอนเทนต์ 30 วัน (`06-content-plan-30-days.md`) ทุกข้อความพร้อมคัดลอกไปโพสต์ได้ทันที', '',
           '## ลิงก์และ QR แยกตามแพลตฟอร์ม', '',
           '| แพลตฟอร์ม | ลิงก์ | QR |', '|---|---|---|']
    for l in LINKS.values():
        out.append(f"| {l['name']} | {l['url']} | `{l['qr_svg']}` / `.png` |")
    out += ['',
            'ลิงก์แต่ละแพลตฟอร์มมีพารามิเตอร์ `utm_source` บอกแหล่งที่มา ไม่มีข้อมูลส่วนบุคคล และเปิดหน้าเว็บเดียวกันทุกลิงก์ '
            'เว็บแอปเวอร์ชันนี้ไม่มีระบบเก็บสถิติ จึงยังไม่มีใครนับค่าเหล่านี้ ให้ดูยอดคลิกจาก Insights ของแต่ละแพลตฟอร์ม '
            'ถ้าวันหน้าเพิ่มระบบสถิติ ลิงก์ชุดนี้จะแยกแหล่งที่มาได้ทันที (ต้องแจ้งในหน้าความเป็นส่วนตัวก่อนเปิดใช้)', '',
            'QR ทุกไฟล์ตรวจด้วยโปรแกรมแล้วว่าถอดรหัสได้ตรงกับลิงก์ ทั้งขนาดเต็มและเมื่อย่อเหลือ 200px', '',
            '## ภาพสำหรับโพสต์ (`marketing/graphics/`)', '',
            '| ไฟล์ | ขนาด | ใช้กับ |', '|---|---|---|',
            '| `feed-4x5_1080x1350.png` | 1080×1350 | โพสต์ Facebook, Instagram, Threads, LINE VOOM |',
            '| `story-9x16_1080x1920.png` | 1080×1920 | สตอรี่ Instagram/Facebook, ภาพปก/ปิดท้าย TikTok และ YouTube Shorts (เว้นที่ใต้ปุ่มสีส้มไว้วางสติกเกอร์ลิงก์) |',
            '| `landscape-16x9_1600x900.png` | 1600×900 | X, โพสต์ชุมชน YouTube, ลิงก์ Facebook |',
            '| `line-square_1040x1040.png` | 1040×1040 | Rich message ของ LINE OA (มี QR ของลิงก์ LINE) |',
            '| `poster-a4_1240x1754.png` | A4 (150 dpi) | โปสเตอร์/ใบปลิว/ตั้งโต๊ะ (มี QR ลิงก์หลัก) |',
            '', 'ขนาดภาพอ้างอิงจากสัดส่วนที่ใช้กันทั่วไป ตรวจข้อกำหนดล่าสุดของแต่ละแพลตฟอร์มก่อนอัปโหลด', '']
    for p in PLATFORMS:
        out += [f"## {p['name']}", '', f"**ลิงก์:** {LINKS[p['id']]['url']}", '',
                f"**ใส่ลิงก์ที่ไหน:** {p['where']}", '',
                '**ภาพที่ใช้:** ' + ', '.join(f'`{i}`' for i in p['images']), '']
        for title, body in p['posts']:
            out += [f'### {title}', '', '```text', fill(body, p['id']), '```', '']
        if p['hashtags']:
            out += ['**แฮชแท็ก:** ' + p['hashtags'], '']
        if p.get('script'):
            out += ['**สคริปต์วิดีโอสั้น 15–20 วินาที** (ใช้ร่วมกันได้ทั้ง TikTok, Reels, Shorts)', '',
                    '| ช่วงเวลา | ภาพ/ข้อความบนจอ | เสียงพูด |', '|---|---|---|']
            out += [f'| {t} | {v} | {s} |' for t, v, s in VIDEO_SCRIPT]
            out.append('')
    out += ['## Quote สำหรับโปรโมต', '',
            'ใช้เป็นหัวโพสต์ การ์ดคำคม ข้อความบนภาพ หรือปิดท้ายคลิป ใส่ #เช็คดวงดิ๊ และถ้าทำเป็นภาพ ให้มีข้อความเล็ก "เนื้อหาเพื่อความบันเทิง"', '']
    for cat, use, items in QUOTES:
        out += [f'### {cat}', f'_{use}_', ''] + [f'- {q}' for q in items] + ['']
    out += ['## ข้อควรระวังทุกแพลตฟอร์ม',
            '- ใช้วันเกิดสมมติในคลิปและภาพ และเขียนกำกับว่า "ข้อมูลตัวอย่าง"',
            '- ชวนแชร์ชื่อช่วง (ลมส่ง/เก็บแรง/ชะลอ) ไม่ชวนให้คอมเมนต์วันเกิด เวลาเกิด หรือจังหวัดที่เกิด',
            '- ไม่ใช้ข้อความขู่ ไม่อ้างความแม่นยำ และไม่ผูกคำทำนายกับการเงิน สุขภาพ หรือกฎหมาย',
            '- ถ้าเป็นโพสต์ที่ได้รับการสนับสนุน ให้เปิดเผยตามแนวทางในเอกสาร 06 หัวข้อ 9', '']
    with open(os.path.join(ROOT, 'docs', '07-social-promo-kit.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))


# ---------------------------------------------------------------- HTML kit
def inline_svg(path):
    svg = open(os.path.join(ROOT, path), encoding='utf-8').read()
    svg = re.sub(r'<title>.*?</title>', '', svg)
    return svg.replace('width="1024" height="1024"', 'class="qr-svg" aria-hidden="true"')


def thumb(name, width=520):
    from PIL import Image
    img = Image.open(os.path.join(ROOT, 'marketing', 'graphics', name)).convert('RGB')
    h = round(img.height * width / img.width)
    buf = io.BytesIO()
    img.resize((width, h), Image.LANCZOS).save(buf, 'JPEG', quality=82, optimize=True)
    return f'data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode()}', width, h


def copy_block(label, text, idx):
    return (f'<div class="block"><div class="block-head"><h4>{html.escape(label)}</h4>'
            f'<button type="button" class="copy" data-target="t{idx}">คัดลอก</button></div>'
            f'<pre id="t{idx}" class="text">{html.escape(text)}</pre></div>')


def build_html():
    css = open(os.path.join(ROOT, 'scripts', 'promo-kit.css'), encoding='utf-8').read()
    n = 0
    sections = []
    nav = []
    for p in PLATFORMS:
        pid = p['id']
        link = LINKS[pid]['url']
        nav.append(f'<a href="#{pid}">{html.escape(p["name"])}</a>')
        blocks = []
        for title, body in p['posts']:
            n += 1
            blocks.append(copy_block(title, fill(body, pid), n))
        if p['hashtags']:
            n += 1
            blocks.append(copy_block('แฮชแท็ก', p['hashtags'], n))
        script = ''
        if p.get('script'):
            rows = ''.join(f'<tr><th scope="row">{t}</th><td>{html.escape(v)}</td><td>{html.escape(s)}</td></tr>' for t, v, s in VIDEO_SCRIPT)
            script = ('<details class="script"><summary>สคริปต์วิดีโอสั้น 15–20 วินาที</summary><div class="table-wrap"><table>'
                      '<thead><tr><th scope="col">ช่วง</th><th scope="col">ภาพ/ข้อความบนจอ</th><th scope="col">เสียงพูด</th></tr></thead>'
                      f'<tbody>{rows}</tbody></table></div></details>')
        n += 1
        sections.append(f'''
<section class="platform" id="{pid}" aria-labelledby="h-{pid}">
  <div class="platform-head">
    <div class="ph-text">
      <h2 id="h-{pid}">{html.escape(p["name"])}</h2>
      <p class="where">{html.escape(p["where"])}</p>
      <div class="linkrow"><code id="t{n}">{html.escape(link)}</code><button type="button" class="copy primary" data-target="t{n}">คัดลอกลิงก์</button></div>
      <p class="imgs">ภาพที่ใช้: {html.escape(", ".join(p["images"]))}</p>
    </div>
    <figure class="qr">{inline_svg(LINKS[pid]["qr_svg"])}<figcaption>QR ของลิงก์ {html.escape(p["name"])}</figcaption></figure>
  </div>
  <div class="blocks">{"".join(blocks)}</div>
  {script}
</section>''')

    gallery = ''
    for name, label in [('feed-4x5_1080x1350.png', 'โพสต์ 4:5'), ('story-9x16_1080x1920.png', 'สตอรี่ 9:16'),
                        ('landscape-16x9_1600x900.png', 'แนวนอน 16:9'), ('line-square_1040x1040.png', 'LINE สี่เหลี่ยม'),
                        ('poster-a4_1240x1754.png', 'โปสเตอร์ A4')]:
        src, w, h = thumb(name)
        gallery += f'<figure><img src="{src}" width="{w}" height="{h}" alt="ภาพโปรโมต{label}" loading="lazy"><figcaption>{label}<br><span>{name}</span></figcaption></figure>'

    quote_html = ''
    for cat, use, items in QUOTES:
        lis = ''
        for q in items:
            n += 1
            lis += f'<li><span id="t{n}">{html.escape(q)}</span><button type="button" class="copy" data-target="t{n}">คัดลอก</button></li>'
        quote_html += f'<div class="qgroup"><h3>{html.escape(cat)}</h3><p class="where">{html.escape(use)}</p><ul class="quotes">{lis}</ul></div>'

    n += 1
    page = f'''<title>ชุดโปรโมตเช็คดวงดิ๊</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap">
<style>{css}</style>
<div class="page">
  <header class="top">
    <div class="brand"><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" stroke-width="5" stroke-dasharray="6.9 2"/><circle cx="24" cy="7" r="4.2" fill="var(--marigold)" stroke="var(--ink)" stroke-width="1.6"/></svg>
      <div><p class="b-th">เช็คดวงดิ๊</p><p class="b-en">Check Duang Di<sup>CDD</sup> โดย Vanij</p></div></div>
    <h1>ชุดโปรโมตโซเชียลมีเดีย</h1>
    <p class="lead">ลิงก์ QR และข้อความพร้อมโพสต์สำหรับ 7 แพลตฟอร์ม กดคัดลอกแล้ววางได้เลย ทุกลิงก์เปิดหน้าเว็บเดียวกัน ต่างกันแค่พารามิเตอร์บอกแหล่งที่มา</p>
    <div class="main-link">
      <div><h2>ลิงก์หลัก</h2><p class="where">ใช้กับสิ่งพิมพ์ ป้าย และที่อื่นที่ไม่ใช่โซเชียล</p>
        <div class="linkrow"><code id="t{n}">{html.escape(MAIN)}</code><button type="button" class="copy primary" data-target="t{n}">คัดลอกลิงก์</button></div></div>
      <figure class="qr">{inline_svg(LINKS["main"]["qr_svg"])}<figcaption>QR ลิงก์หลัก</figcaption></figure>
    </div>
    <nav class="tabs" aria-label="แพลตฟอร์ม">{"".join(nav)}<a href="#quotes">Quote</a><a href="#graphics">ภาพโพสต์</a></nav>
  </header>
  {"".join(sections)}
  <section class="platform" id="quotes" aria-labelledby="h-quotes">
    <h2 id="h-quotes">Quote สำหรับโปรโมต</h2>
    <p class="where">ใช้เป็นหัวโพสต์ การ์ดคำคม ข้อความบนภาพ หรือปิดท้ายคลิป ใส่ #เช็คดวงดิ๊ และถ้าทำเป็นภาพ ให้มีข้อความเล็ก "เนื้อหาเพื่อความบันเทิง"</p>
    {quote_html}
  </section>
  <section class="platform" id="graphics" aria-labelledby="h-graphics">
    <h2 id="h-graphics">ภาพโพสต์</h2>
    <p class="where">ภาพตัวอย่างย่อขนาด ไฟล์ขนาดเต็มและ QR แบบ PNG/SVG ส่งให้ในแชต และอยู่ใน repository โฟลเดอร์ marketing/</p>
    <div class="gallery">{gallery}</div>
  </section>
  <footer class="note">
    <p>ลิงก์ทุกอันมีพารามิเตอร์ <code>utm_source</code> บอกแหล่งที่มาเท่านั้น ไม่มีข้อมูลส่วนบุคคล เว็บแอปเวอร์ชันนี้ยังไม่มีระบบเก็บสถิติ ให้ดูยอดคลิกจาก Insights ของแต่ละแพลตฟอร์ม</p>
    <p>ใช้วันเกิดสมมติในภาพและคลิปเสมอ และชวนแชร์ชื่อช่วง ไม่ชวนบอกวันเกิด</p>
  </footer>
  <p class="toast" id="toast" role="status" aria-live="polite"></p>
</div>
<script>
(function () {{
  var toast = document.getElementById('toast');
  var timer;
  function show(msg) {{
    toast.textContent = msg; toast.classList.add('on');
    clearTimeout(timer); timer = setTimeout(function () {{ toast.classList.remove('on'); }}, 1800);
  }}
  function selectText(el) {{
    var r = document.createRange(); r.selectNodeContents(el);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }}
  document.addEventListener('click', function (e) {{
    var btn = e.target.closest('button.copy');
    if (!btn) return;
    var el = document.getElementById(btn.getAttribute('data-target'));
    var text = el.textContent;
    var done = function () {{ btn.textContent = 'คัดลอกแล้ว'; setTimeout(function () {{ btn.textContent = btn.classList.contains('primary') ? 'คัดลอกลิงก์' : 'คัดลอก'; }}, 1500); show('คัดลอกแล้ว วางในแอปที่ต้องการได้เลย'); }};
    var fail = function () {{ selectText(el); show('คัดลอกอัตโนมัติไม่ได้ ข้อความถูกเลือกไว้แล้ว กดคัดลอกเอง'); }};
    try {{
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fail);
      else fail();
    }} catch (err) {{ fail(); }}
  }});
}})();
</script>
'''
    os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
    with open(os.path.join(ROOT, 'dist', 'promo-kit.html'), 'w', encoding='utf-8') as f:
        f.write(page)
    print(f'dist/promo-kit.html {len(page) // 1024} KB')


if __name__ == '__main__':
    build_markdown()
    build_html()
    print('docs/07-social-promo-kit.md')
