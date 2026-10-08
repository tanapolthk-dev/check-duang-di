// การตั้งค่าที่เปิดเผยได้ (ไม่มี secret ในแอปนี้ และไม่ควรใส่ secret ในไฟล์ฝั่งเบราว์เซอร์เด็ดขาด)
export const CONFIG = {
  // URL สาธารณะของเว็บแอปหลัง deploy จริง เช่น 'https://<username>.github.io/check-duang-di/'
  // เว้นว่างไว้จนกว่าจะ deploy สำเร็จ — ระบบจะไม่สร้าง QR code ไปยัง URL ที่ยังไม่มีอยู่จริง
  // หมายเหตุ: ถ้าเว็บเปิดอยู่บนโดเมน *.github.io ระบบจะใช้ URL ปัจจุบันให้อัตโนมัติ
  publicUrl: '',
  version: '0.2.0',
  storageKey: 'cdd:v1:remember',
};
