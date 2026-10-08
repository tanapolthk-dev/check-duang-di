"""ชุดทดสอบ end-to-end ของเช็คดวงดิ๊ (Playwright + Chromium)

วิธีรัน:  python3 tests/e2e/run_e2e.py
ต้องมี:   pip install playwright opencv-python-headless  และ  python3 -m playwright install chromium

สคริปต์จะเปิดเว็บเซิร์ฟเวอร์ภายในเครื่อง (localhost) รันทุกกรณี แล้วพิมพ์สรุปผล
ไม่มีการส่งข้อมูลออกนอกเครื่อง
"""
import functools
import http.server
import json
import os
import socketserver
import sys
import threading
import traceback

import cv2
import numpy as np
from playwright.sync_api import sync_playwright, expect

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.environ.get('E2E_OUT', os.path.join(ROOT, 'tests', 'e2e', 'output'))
os.makedirs(OUT, exist_ok=True)

results = []


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def start_server():
    handler = functools.partial(QuietHandler, directory=ROOT)
    httpd = socketserver.TCPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f'http://127.0.0.1:{httpd.server_address[1]}/'


def case(name):
    def deco(fn):
        fn.case_name = name
        return fn
    return deco


def new_page(browser, base, viewport=None, **kw):
    ctx = browser.new_context(viewport=viewport or {'width': 1280, 'height': 860}, **kw)
    page = ctx.new_page()
    page.console_errors = []
    page.external_requests = []
    page.on('console', lambda m: page.console_errors.append(m.text) if m.type in ('error', 'warning') else None)
    page.on('pageerror', lambda e: page.console_errors.append(f'pageerror: {e}'))
    page.on('request', lambda r: page.external_requests.append(r.url) if not r.url.startswith(base) and not r.url.startswith('data:') else None)
    return ctx, page


def fill_valid(page, day='15', month='3', year='2535', time='08:30', province='chiang-mai', unknown=False):
    page.select_option('#f-day', day)
    page.select_option('#f-month', month)
    page.fill('#f-year', year)
    if unknown:
        page.check('#f-time-unknown')
    else:
        page.fill('#f-time', time)
    if province is not None:
        page.select_option('#f-province', province)


def assert_clean(page):
    assert not page.console_errors, f'console errors: {page.console_errors}'
    assert not page.external_requests, f'external requests: {page.external_requests}'


# ---------------------------------------------------------------- cases
@case('1. เปิดหน้าแรกและกดเริ่มใช้งานได้')
def t_home(browser, base):
    ctx, page = new_page(browser, base)
    page.goto(base)
    expect(page.locator('h1')).to_have_text('เช็คดวงดิ๊')
    expect(page.locator('.wordmark-en sup')).to_have_text('CDD')
    page.get_by_role('link', name='เริ่มเช็คดวง').click()
    expect(page.locator('h1')).to_have_text('กรอกข้อมูลเกิด')
    assert page.url.endswith('#/check')
    assert_clean(page)
    ctx.close()


@case('2. ส่งฟอร์มว่างได้รับคำแนะนำทุกช่องที่จำเป็น')
def t_empty_form(browser, base):
    ctx, page = new_page(browser, base)
    page.goto(base + '#/check')
    page.get_by_role('button', name='ดูผลเช็คดวง').click()
    summary = page.locator('#error-summary')
    expect(summary).to_be_visible()
    expect(summary.locator('li')).to_have_count(4)
    expect(summary).to_be_focused()
    for sel in ['#f-day', '#f-month', '#f-year', '#f-time']:
        expect(page.locator(sel)).to_have_attribute('aria-invalid', 'true')
    # คลิกลิงก์ในสรุปแล้วโฟกัสไปที่ช่อง โดยไม่เปลี่ยนหน้า
    summary.locator('a').nth(2).click()
    expect(page.locator('#f-year')).to_be_focused()
    assert page.url.endswith('#/check')
    assert_clean(page)
    ctx.close()


@case('3. กรอกข้อมูลผิดรูปแบบได้รับคำแนะนำเฉพาะเรื่อง')
def t_invalid(browser, base):
    ctx, page = new_page(browser, base)
    page.goto(base + '#/check')
    fill_valid(page, year='1992', unknown=True, province=None)
    page.get_by_role('button', name='ดูผลเช็คดวง').click()
    expect(page.locator('#f-year-err')).to_contain_text('ค.ศ.')
    expect(page.locator('#f-year-err')).to_contain_text('2535')
    page.fill('#f-year', '2535')
    page.select_option('#f-day', '31')
    page.select_option('#f-month', '2')
    page.get_by_role('button', name='ดูผลเช็คดวง').click()
    expect(page.locator('#f-day-err')).to_contain_text('ไม่มีในเดือนกุมภาพันธ์')
    # ค่าที่กรอกไว้ยังอยู่หลังแสดงข้อผิดพลาด
    expect(page.locator('#f-year')).to_have_value('2535')
    expect(page.locator('#f-time-unknown')).to_be_checked()
    assert_clean(page)
    ctx.close()


@case('4. กรอกข้อมูลถูกต้อง เห็น Loading แล้วเห็นผลลัพธ์ครบทุกหมวดและกราฟ')
def t_valid(browser, base):
    ctx, page = new_page(browser, base)
    page.goto(base + '#/check')
    fill_valid(page)
    page.get_by_role('button', name='ดูผลเช็คดวง').click()
    expect(page.locator('h1')).to_have_text('กำลังจัดเตรียมผล')
    expect(page.locator('h1')).to_contain_text('ผลเช็คดวงของคุณ', timeout=5000)
    for cid in ['basics', 'overall', 'love', 'work', 'money', 'rhythm']:
        expect(page.locator(f'#cat-{cid}')).to_be_visible()
    expect(page.locator('#chart svg')).to_be_visible()
    expect(page.locator('#chart svg path.chart-line')).to_have_count(1)
    expect(page.locator('#chart svg circle.chart-now')).to_have_count(1)
    expect(page.locator('table.data tbody tr')).to_have_count(85)
    expect(page.locator('.legend')).to_contain_text('±10')
    expect(page.locator('.result-meta')).to_contain_text('ระบุเวลาเกิด')
    expect(page.locator('.result-meta')).to_contain_text('จังหวัดเชียงใหม่')
    # มีป้ายบอกที่มาทั้ง 3 แบบ
    for label in ['ปฏิทิน', 'ความเชื่อ', 'จำลอง']:
        assert page.locator('.src', has_text=label).count() > 0
    page.screenshot(path=os.path.join(OUT, 'result-desktop.png'), full_page=True)
    assert_clean(page)
    ctx.close()


@case('5. ข้ามเวลาเกิดได้ และกราฟแสดงช่วงความไม่แน่นอนกว้างขึ้น')
def t_skip_time(browser, base):
    ctx, page = new_page(browser, base)
    page.goto(base + '#/check')
    fill_valid(page, unknown=True, province=None)
    expect(page.locator('#f-time')).to_be_disabled()
    page.get_by_role('button', name='ดูผลเช็คดวง').click()
    expect(page.locator('h1')).to_contain_text('ผลเช็คดวงของคุณ', timeout=5000)
    expect(page.locator('.result-meta')).to_contain_text('ไม่ระบุเวลาเกิด')
    expect(page.locator('.legend')).to_contain_text('±15')
    expect(page.locator('.note-list')).to_contain_text('ไม่ทราบเวลาเกิด')
    assert_clean(page)
    ctx.close()


@case('6. แถบเลื่อนอายุเปลี่ยนคำอธิบายและจุดบนกราฟ')
def t_slider(browser, base):
    ctx, page = new_page(browser, base)
    page.goto(base + '#/check')
    fill_valid(page)
    page.get_by_role('button', name='ดูผลเช็คดวง').click()
    expect(page.locator('#age-range')).to_be_visible(timeout=5000)
    before = page.locator('#age-out').inner_text()
    page.locator('#age-range').focus()
    for _ in range(5):
        page.keyboard.press('ArrowRight')
    after = page.locator('#age-out').inner_text()
    assert before != after, 'คำอธิบายไม่เปลี่ยน'
    expect(page.locator('#chart circle.chart-sel')).to_have_count(1)
    assert_clean(page)
    ctx.close()


@case('7. Error state แสดงและกดลองอีกครั้งได้')
def t_error(browser, base):
    ctx, page = new_page(browser, base)
    page.goto(base + '#/check')
    fill_valid(page)
    page.evaluate('window.__CDD_FORCE_ERROR__ = true')
    page.get_by_role('button', name='ดูผลเช็คดวง').click()
    expect(page.locator('h1')).to_have_text('สร้างผลลัพธ์ไม่สำเร็จ', timeout=5000)
    page.get_by_role('button', name='ลองอีกครั้ง').click()
    expect(page.locator('h1')).to_contain_text('ผลเช็คดวงของคุณ', timeout=5000)
    assert_clean(page)
    ctx.close()


@case('8. Empty state เมื่อเปิดหน้าผลลัพธ์โดยไม่มีข้อมูล')
def t_empty_state(browser, base):
    ctx, page = new_page(browser, base)
    page.goto(base + '#/result')
    expect(page.locator('h1')).to_have_text('ยังไม่มีผลเช็คดวง')
    page.get_by_role('link', name='กรอกวันเกิด').click()
    expect(page.locator('h1')).to_have_text('กรอกข้อมูลเกิด')
    assert_clean(page)
    ctx.close()


@case('9. ข้อความแชร์ไม่มีข้อมูลเกิด และปุ่มคัดลอกทำงาน')
def t_share(browser, base):
    ctx, page = new_page(browser, base, permissions=['clipboard-read', 'clipboard-write'])
    page.goto(base + '#/check')
    fill_valid(page, day='23', month='7', year='2531', time='21:45', province='songkhla')
    page.get_by_role('button', name='ดูผลเช็คดวง').click()
    expect(page.locator('#share-text')).to_be_visible(timeout=5000)
    text = page.locator('#share-text').inner_text()
    for leak in ['2531', '21:45', 'สงขลา', 'กรกฎาคม', '23 ']:
        assert leak not in text, f'ข้อความแชร์มีข้อมูลเกิด: {leak}'
    assert 'cat-' not in page.url and '2531' not in page.url, 'URL มีข้อมูลเกิด'
    page.get_by_role('button', name='คัดลอกข้อความ').click()
    expect(page.locator('#share-status')).to_contain_text('คัดลอกข้อความแล้ว')
    clip = page.evaluate('navigator.clipboard.readText()')
    assert clip == text, 'ข้อความในคลิปบอร์ดไม่ตรงกับตัวอย่าง'
    assert_clean(page)
    ctx.close()


@case('10. ไม่ติ๊ก "จำข้อมูล" แล้วไม่มีอะไรถูกเก็บในเครื่อง')
def t_no_storage(browser, base):
    ctx, page = new_page(browser, base)
    page.goto(base + '#/check')
    fill_valid(page)
    page.get_by_role('button', name='ดูผลเช็คดวง').click()
    expect(page.locator('h1')).to_contain_text('ผลเช็คดวงของคุณ', timeout=5000)
    storage = page.evaluate('JSON.stringify({l: Object.keys(localStorage), s: Object.keys(sessionStorage), c: document.cookie})')
    assert storage == json.dumps({'l': [], 's': [], 'c': ''}, separators=(',', ':')), storage
    assert_clean(page)
    ctx.close()


@case('11. ติ๊ก "จำข้อมูล" แล้วกลับมาใช้งานได้ และลบได้จากหน้าความเป็นส่วนตัว')
def t_remember(browser, base):
    ctx, page = new_page(browser, base)
    page.goto(base + '#/check')
    fill_valid(page)
    page.check('#f-remember')
    page.get_by_role('button', name='ดูผลเช็คดวง').click()
    expect(page.locator('h1')).to_contain_text('ผลเช็คดวงของคุณ', timeout=5000)
    page.goto(base + '#/check')
    page.reload()
    expect(page.locator('#f-year')).to_have_value('2535')
    expect(page.locator('#f-time')).to_have_value('08:30')
    expect(page.locator('#f-province')).to_have_value('chiang-mai')
    page.goto(base + '#/privacy')
    page.get_by_role('button', name='ลบข้อมูลที่จำไว้').click()
    expect(page.locator('#privacy-status')).to_contain_text('ลบข้อมูลที่จำไว้บนเครื่องนี้แล้ว')
    assert page.evaluate('localStorage.length') == 0
    page.goto(base + '#/check')
    page.reload()
    expect(page.locator('#f-year')).to_have_value('')
    assert_clean(page)
    ctx.close()


@case('12. หน้าเปิดบนมือถือ: ไม่มี URL จริง → ไม่สร้าง QR')
def t_open_no_url(browser, base):
    ctx, page = new_page(browser, base)
    page.goto(base + '#/open')
    expect(page.locator('.qr-box')).to_have_count(0)
    expect(page.locator('main')).to_contain_text('ยังไม่มี URL สาธารณะ')
    assert_clean(page)
    ctx.close()


@case('13. QR code ถอดรหัสได้ตรงกับ URL และเปิดเว็บได้ (จำลอง publicUrl เป็นเซิร์ฟเวอร์ทดสอบในเครื่อง)')
def t_qr(browser, base):
    ctx, page = new_page(browser, base, permissions=['clipboard-read', 'clipboard-write'])
    target = base  # URL ที่มีอยู่จริงระหว่างทดสอบ (localhost)

    def fake_config(route):
        body = f"export const CONFIG = {{ publicUrl: '{target}', version: 'test', storageKey: 'cdd:v1:remember' }};"
        route.fulfill(status=200, content_type='text/javascript', body=body)

    page.route('**/src/config.js', fake_config)
    page.goto(base + '#/open')
    box = page.locator('.qr-box')
    expect(box).to_be_visible()
    png = box.screenshot(path=os.path.join(OUT, 'qr.png'))
    img = cv2.imdecode(np.frombuffer(png, np.uint8), cv2.IMREAD_COLOR)
    data, _, _ = cv2.QRCodeDetector().detectAndDecode(img)
    assert data == target, f'QR ถอดได้ {data!r} ไม่ตรงกับ {target!r}'
    page.get_by_role('button', name='คัดลอกลิงก์').click()
    expect(page.locator('#url-status')).to_contain_text('คัดลอกลิงก์แล้ว')
    assert page.evaluate('navigator.clipboard.readText()') == target
    page.unroute('**/src/config.js')
    page.goto(data)
    expect(page.locator('h1')).to_have_text('เช็คดวงดิ๊')
    ctx.close()


@case('14. ใช้งานบนมือถือ (390×844): ไม่มีแถบเลื่อนแนวนอน และทำงานครบ flow')
def t_mobile(browser, base):
    ctx, page = new_page(browser, base, viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    for route in ['#/', '#/check', '#/how', '#/privacy', '#/open', '#/result']:
        page.goto(base + route)
        page.wait_for_timeout(150)
        sw, iw = page.evaluate('[document.documentElement.scrollWidth, window.innerWidth]')
        assert sw <= iw, f'{route}: scrollWidth {sw} > {iw}'
    page.goto(base + '#/check')
    fill_valid(page, unknown=True)
    page.get_by_role('button', name='ดูผลเช็คดวง').click()
    expect(page.locator('#chart svg')).to_be_visible(timeout=5000)
    sw, iw = page.evaluate('[document.documentElement.scrollWidth, window.innerWidth]')
    assert sw <= iw, f'result: scrollWidth {sw} > {iw}'
    box = page.locator('#chart svg').bounding_box()
    assert box['width'] <= iw, 'กราฟกว้างเกินจอ'
    page.screenshot(path=os.path.join(OUT, 'result-mobile.png'), full_page=True)
    assert_clean(page)
    ctx.close()


@case('15. แท็บเล็ต (820×1180) และโหมดมืด แสดงผลได้')
def t_tablet_dark(browser, base):
    ctx, page = new_page(browser, base, viewport={'width': 820, 'height': 1180}, color_scheme='dark')
    page.goto(base + '#/check')
    fill_valid(page)
    page.get_by_role('button', name='ดูผลเช็คดวง').click()
    expect(page.locator('#chart svg')).to_be_visible(timeout=5000)
    bg = page.evaluate('getComputedStyle(document.body).backgroundColor')
    assert bg == 'rgb(15, 21, 54)', f'พื้นหลังโหมดมืดไม่ถูกต้อง: {bg}'
    page.screenshot(path=os.path.join(OUT, 'result-tablet-dark.png'), full_page=True)
    assert_clean(page)
    ctx.close()


@case('16. ใช้งานด้วยคีย์บอร์ดได้ตั้งแต่หน้าแรกจนเห็นผล')
def t_keyboard(browser, base):
    ctx, page = new_page(browser, base)
    page.goto(base)
    page.keyboard.press('Tab')
    expect(page.locator('.skip-link')).to_be_focused()
    page.locator('a.btn-primary').focus()
    page.keyboard.press('Enter')
    expect(page.locator('h1')).to_have_text('กรอกข้อมูลเกิด')
    page.locator('#f-day').focus()
    page.keyboard.press('Tab')
    expect(page.locator('#f-month')).to_be_focused()
    page.keyboard.press('Tab')
    expect(page.locator('#f-year')).to_be_focused()
    page.keyboard.type('2540')
    page.select_option('#f-day', '2')
    page.select_option('#f-month', '6')
    page.locator('#f-time-unknown').focus()
    page.keyboard.press('Space')
    expect(page.locator('#f-time-unknown')).to_be_checked()
    page.locator('button[type=submit]').focus()
    page.keyboard.press('Enter')
    expect(page.locator('h1')).to_contain_text('ผลเช็คดวงของคุณ', timeout=5000)
    expect(page.locator('h1')).to_be_focused()
    # ลิงก์ข้ามไปยังหมวดไม่เปลี่ยนหน้า
    page.locator('a[data-jump="cat-rhythm"]').focus()
    page.keyboard.press('Enter')
    expect(page.locator('#cat-rhythm')).to_be_focused()
    assert page.url.endswith('#/result')
    assert_clean(page)
    ctx.close()


@case('18. ฟอร์มมีครบ 77 จังหวัดจัดกลุ่มตามภาค และข้อมูลภูมิภาคที่จำไว้จากเวอร์ชันเก่าแปลงเป็นจังหวัดได้')
def t_provinces(browser, base):
    ctx, page = new_page(browser, base)
    page.goto(base + '#/check')
    opts = page.locator('#f-province optgroup option')
    expect(opts).to_have_count(78)  # 77 จังหวัด + ต่างประเทศ
    expect(page.locator('#f-province optgroup')).to_have_count(7)
    first = page.locator('#f-province optgroup').first.locator('option').first
    expect(first).to_have_text('กรุงเทพมหานคร')
    page.evaluate("localStorage.setItem('cdd:v1:remember', JSON.stringify({day:'1',month:'2',yearBE:'2530',time:'',timeUnknown:true,region:'north'}))")
    page.reload()
    expect(page.locator('#f-province')).to_have_value('chiang-mai')
    page.evaluate('localStorage.clear()')
    assert_clean(page)
    ctx.close()


@case('17. ทุกหน้าโหลดได้ ไม่มี console error ไม่มีการเรียกเครือข่ายภายนอก และมีหน้าไม่พบ')
def t_all_pages(browser, base):
    ctx, page = new_page(browser, base)
    titles = {
        '#/how': 'หลักการทำงานและข้อจำกัด',
        '#/privacy': 'ความเป็นส่วนตัวและการใช้ข้อมูล',
        '#/open': 'เปิดบนมือถือ',
        '#/nowhere': 'ไม่พบหน้านี้',
    }
    for route, title in titles.items():
        page.goto(base + route)
        expect(page.locator('h1')).to_have_text(title)
    assert_clean(page)
    csp = page.locator('meta[http-equiv="Content-Security-Policy"]').get_attribute('content')
    assert "connect-src 'none'" in csp
    ctx.close()


def main():
    httpd, base = start_server()
    cases = [v for v in globals().values() if callable(v) and hasattr(v, 'case_name')]
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for fn in cases:
            try:
                fn(browser, base)
                results.append((fn.case_name, 'ผ่าน', ''))
            except Exception as e:  # noqa: BLE001
                results.append((fn.case_name, 'ไม่ผ่าน', f'{type(e).__name__}: {e}'))
                traceback.print_exc()
        version = browser.version
        browser.close()
    httpd.shutdown()
    print(f'\nChromium {version}')
    for name, status, detail in results:
        print(f'[{status}] {name}' + (f'\n        {detail}' if detail else ''))
    passed = sum(1 for r in results if r[1] == 'ผ่าน')
    print(f'\nสรุป: ผ่าน {passed}/{len(results)}')
    with open(os.path.join(OUT, 'e2e-results.json'), 'w', encoding='utf-8') as f:
        json.dump({'browser': f'Chromium {version}', 'results': results}, f, ensure_ascii=False, indent=2)
    sys.exit(0 if passed == len(results) else 1)


if __name__ == '__main__':
    main()
