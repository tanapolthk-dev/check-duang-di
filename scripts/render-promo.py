"""เรนเดอร์ภาพโปรโมตและ QR PNG สำหรับโซเชียลมีเดีย แล้วตรวจถอดรหัส QR ทุกไฟล์

วิธีใช้:  node scripts/make-promo-links.mjs && python3 scripts/render-promo.py
ต้องมี:   pip install playwright opencv-python-headless numpy && python3 -m playwright install chromium
ผลลัพธ์:  marketing/qr/*.png และ marketing/graphics/*.png
"""
import json
import os
import sys

import cv2
import numpy as np
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MK = os.path.join(ROOT, 'marketing')
FONTS = 'file://' + os.path.join(ROOT, 'assets', 'fonts')
LINKS = {l['id']: l for l in json.load(open(os.path.join(MK, 'links.json'), encoding='utf-8'))}
SHORT_URL = 'tanapolthk-dev.github.io/check-duang-di'


def font_faces():
    css = ''
    for w in (400, 500, 600, 700):
        for sub in ('thai', 'latin'):
            css += (f"@font-face{{font-family:'Plex';font-weight:{w};"
                    f"src:url({FONTS}/ibm-plex-sans-thai-{sub}-{w}-normal.woff2) format('woff2');}}")
    return css


RING = '''<svg class="ring" viewBox="0 0 48 48" aria-hidden="true">
<circle cx="24" cy="24" r="17" fill="none" stroke="#F4F6FC" stroke-opacity=".9" stroke-width="5" stroke-dasharray="6.9 2"/>
<circle cx="24" cy="7" r="4.2" fill="#F4A81D" stroke="#1F2B6B" stroke-width="1.6"/></svg>'''

CHIPS = '''<div class="chips"><span class="c c1">ลมส่ง</span><span class="c c2">เก็บแรง</span><span class="c c3">ชะลอ</span></div>'''


def page(w, h, body, extra_css=''):
    s = w / 1080  # สเกลตัวอักษรตามความกว้าง
    return f'''<!doctype html><html lang="th"><head><meta charset="utf-8"><style>
{font_faces()}
*{{box-sizing:border-box;margin:0}}
html,body{{width:{w}px;height:{h}px}}
body{{font-family:'Plex',sans-serif;background:#1F2B6B;color:#F4F6FC;overflow:hidden;position:relative}}
.wrap{{position:absolute;inset:{int(80*s)}px;display:flex;flex-direction:column}}
.brand{{display:flex;align-items:center;gap:{int(18*s)}px}}
.brand .ring{{width:{int(84*s)}px;height:{int(84*s)}px}}
.brand b{{font-size:{int(44*s)}px;font-weight:700;line-height:1.1;display:block}}
.brand i{{font-style:normal;font-size:{int(26*s)}px;color:#C3C9EA;font-weight:600}}
.brand sup{{color:#F4A81D;font-size:.62em}}
h1{{font-size:{int(96*s)}px;line-height:1.18;font-weight:700;margin-top:{int(70*s)}px}}
.lead{{font-size:{int(40*s)}px;line-height:1.55;color:#E8EBFA;margin-top:{int(28*s)}px;max-width:{int(880*s)}px}}
.chips{{display:flex;gap:{int(16*s)}px;margin-top:{int(44*s)}px;flex-wrap:wrap}}
.c{{font-size:{int(38*s)}px;font-weight:700;padding:{int(14*s)}px {int(30*s)}px;border-radius:{int(20*s)}px}}
.c1{{background:#E2F3EE;color:#17785F}}.c2{{background:#E8EBFA;color:#1F2B6B}}.c3{{background:#FAE6ED;color:#B23A62}}
.foot{{margin-top:auto}}
.cta{{display:inline-block;background:#F4A81D;color:#141B47;font-weight:700;font-size:{int(40*s)}px;padding:{int(18*s)}px {int(40*s)}px;border-radius:999px}}
.assure{{font-size:{int(30*s)}px;color:#E8EBFA;margin-top:{int(26*s)}px}}
.url{{font-size:{int(32*s)}px;font-weight:600;color:#F6B53A;margin-top:{int(10*s)}px;white-space:nowrap}}
.fine{{font-size:{int(24*s)}px;color:#A9B0D6;margin-top:{int(14*s)}px}}
.qr{{background:#fff;border-radius:{int(24*s)}px;padding:{int(18*s)}px;display:inline-block}}
.qr img{{display:block;width:{int(300*s)}px;height:{int(300*s)}px}}
.bigring{{position:absolute;opacity:.12;pointer-events:none}}
{extra_css}
</style></head><body>{body}</body></html>'''


def brand():
    return f'<div class="brand">{RING}<div><b>เช็คดวงดิ๊</b><i>Check Duang Di<sup>CDD</sup></i></div></div>'


def qr_img(pid):
    return f'<div class="qr"><img src="file://{MK}/qr/{pid}.svg" alt=""></div>'


HEAD = '<h1>ปีนี้คุณอยู่ช่วงไหน<br>ของรอบ 12 ปี?</h1>'
LEAD = '<p class="lead">กรอกวันเกิด ดูภาพรวม ความรัก การงาน การเงิน และกราฟจังหวะชีวิต</p>'
FOOT_TXT = ('<p class="assure">ฟรี ไม่ต้องสมัคร ข้อมูลประมวลผลบนเครื่องคุณ</p>'
            f'<p class="url">{SHORT_URL}</p>'
            '<p class="fine">โดย Vanij — เนื้อหาเพื่อความบันเทิงและการสำรวจตนเอง</p>')


def big_ring(size, right, top):
    return (f'<svg class="bigring" viewBox="0 0 48 48" style="width:{size}px;height:{size}px;right:{right}px;top:{top}px">'
            '<circle cx="24" cy="24" r="17" fill="none" stroke="#F4F6FC" stroke-width="5" stroke-dasharray="6.9 2"/></svg>')


GRAPHICS = {
    # ชื่อไฟล์: (กว้าง, สูง, เนื้อหา, ใช้กับ)
    'feed-4x5_1080x1350': (1080, 1350, lambda: big_ring(760, -260, 420) + f'<div class="wrap">{brand()}{HEAD}{LEAD}{CHIPS}<div class="foot"><span class="cta">เช็คฟรีที่ลิงก์</span>{FOOT_TXT}</div></div>'),
    'story-9x16_1080x1920': (1080, 1920, lambda: big_ring(900, -330, 760) + f'<div class="wrap" style="inset:180px 80px 300px">{brand()}<h1 style="font-size:110px;margin-top:120px">ปีนี้คุณอยู่ช่วงไหน<br>ของรอบ 12 ปี?</h1><p class="lead" style="font-size:46px">กรอกวันเกิด 3 ช่อง ดูผล 5 หมวด และกราฟจังหวะชีวิต</p><div class="chips" style="margin-top:60px">{CHIPS[19:-6]}</div><div class="foot"><span class="cta" style="font-size:46px">แตะลิงก์เพื่อเช็คฟรี</span>{FOOT_TXT}</div></div>'),
    'landscape-16x9_1600x900': (1600, 900, lambda: f'<div class="wrap" style="inset:70px 90px;flex-direction:row;gap:60px;align-items:center"><div style="flex:1;display:flex;flex-direction:column;height:100%">{brand()}<h1 style="font-size:80px;margin-top:50px">ปีนี้คุณอยู่ช่วงไหน<br>ของรอบ 12 ปี?</h1><p class="lead" style="font-size:36px">กรอกวันเกิด ดูดวง 5 หมวด และกราฟจังหวะชีวิต</p><div class="foot">{FOOT_TXT}</div></div><svg viewBox="0 0 48 48" style="width:430px;height:430px;flex:none"><circle cx="24" cy="24" r="17" fill="none" stroke="#F4F6FC" stroke-opacity=".9" stroke-width="5" stroke-dasharray="6.9 2"/><circle cx="24" cy="7" r="4.2" fill="#F4A81D" stroke="#1F2B6B" stroke-width="1.6"/></svg></div>'),
    'line-square_1040x1040': (1040, 1040, lambda: f'<div class="wrap" style="inset:70px">{brand()}<h1 style="font-size:78px;margin-top:46px">ปีนี้คุณอยู่ช่วงไหน<br>ของรอบ 12 ปี?</h1><div style="display:flex;gap:40px;align-items:flex-end;margin-top:auto"><div style="flex:1;min-width:0;font-size:0.9em"><span class="cta">เช็คฟรีที่ลิงก์</span>{FOOT_TXT.replace('class="url"', 'class="url" style="font-size:27px"').replace('class="assure"', 'class="assure" style="font-size:27px"')}</div>{qr_img("line")}</div></div>'),
    'poster-a4_1240x1754': (1240, 1754, lambda: big_ring(980, -380, 260) + f'<div class="wrap" style="inset:100px">{brand()}{HEAD}{LEAD}{CHIPS}<div class="foot"><div style="display:flex;gap:50px;align-items:center;justify-content:space-between"><span class="cta">สแกนเพื่อเช็คดวงฟรี</span>{qr_img("main").replace("300", "360")}</div>{FOOT_TXT}</div></div>'),
}


def decode(png_bytes):
    img = cv2.imdecode(np.frombuffer(png_bytes, np.uint8), cv2.IMREAD_COLOR)
    return cv2.QRCodeDetector().detectAndDecode(img)[0]


def main():
    os.makedirs(os.path.join(MK, 'graphics'), exist_ok=True)
    tmp = os.path.join(MK, '.render.html')
    problems = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        # QR PNG แยกแพลตฟอร์ม
        for pid, link in LINKS.items():
            pg.set_viewport_size({'width': 1024, 'height': 1024})
            pg.goto(f'file://{MK}/qr/{pid}.svg')
            out = os.path.join(MK, 'qr', f'{pid}.png')
            png = pg.screenshot(path=out)
            got = decode(png)
            small = cv2.imencode('.png', cv2.resize(cv2.imdecode(np.frombuffer(png, np.uint8), cv2.IMREAD_COLOR), (200, 200), interpolation=cv2.INTER_AREA))[1].tobytes()
            got_small = decode(small)
            ok = got == link['url'] and got_small == link['url']
            print(f'QR {pid:10} {"ผ่าน" if ok else "ไม่ผ่าน"}  {got}')
            if not ok:
                problems.append(pid)
        # ภาพโปรโมต
        for name, (w, h, fn) in GRAPHICS.items():
            with open(tmp, 'w', encoding='utf-8') as f:
                f.write(page(w, h, fn()))
            pg.set_viewport_size({'width': w, 'height': h})
            pg.goto('file://' + tmp)
            pg.evaluate('document.fonts.ready')
            pg.wait_for_timeout(300)
            overflow = pg.evaluate('[...document.querySelectorAll(".wrap *")].some(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 || r.bottom > innerHeight + 1; })')
            png = pg.screenshot(path=os.path.join(MK, 'graphics', f'{name}.png'))
            note = ''
            if 'qr' in fn():
                got = decode(png)
                note = f' QR→{got}'
                expected = LINKS['line' if 'line' in name else 'main']['url']
                if got != expected:
                    problems.append(name + ' qr')
            print(f'ภาพ {name:26} {"ล้นกรอบ!" if overflow else "พอดีกรอบ"}{note}')
            if overflow:
                problems.append(name + ' overflow')
        b.close()
    os.remove(tmp)
    if problems:
        print('มีปัญหา:', problems)
        sys.exit(1)
    print('ทุกไฟล์ผ่านการตรวจ')


if __name__ == '__main__':
    main()
