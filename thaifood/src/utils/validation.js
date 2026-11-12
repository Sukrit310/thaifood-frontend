// Go validates password bytes and text Unicode code points, not UTF-16 units.
export const unicodeLength = value => Array.from(String(value)).length;
export function utf8ByteLength(value) {
  let bytes = 0;
  for (const character of String(value)) {
    const point = character.codePointAt(0);
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}
export function validateNewPassword(value) {
  const bytes = utf8ByteLength(value);
  return bytes < 8 || bytes > 72 ? 'รหัสผ่านต้องมีความยาว 8–72 ไบต์ (ตัวอักษรไทยใช้ประมาณ 3 ไบต์ต่อตัว)' : '';
}
export function validateCurrentPassword(value) {
  const bytes = utf8ByteLength(value);
  return bytes < 1 || bytes > 72 ? 'กรุณากรอกรหัสผ่าน ความยาวไม่เกิน 72 ไบต์' : '';
}
export function validateDisplayName(value) {
  const length = unicodeLength(String(value).trim());
  return length < 1 || length > 100 || String(value).includes('\0') ? 'ชื่อที่แสดงต้องมีความยาว 1–100 ตัวอักษร' : '';
}
export function validateImageUrl(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  if (utf8ByteLength(input) > 2048) return 'ลิงก์รูปภาพต้องไม่เกิน 2048 ไบต์';
  try {
    const url = new URL(input);
    if (!/^https?:\/\/[^/?#\\\s]+/i.test(input) || /[\\\s]/.test(input) || Array.from(input).some(character => character.codePointAt(0) < 32) || !['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error('invalid');
    return '';
  } catch { return 'ลิงก์รูปภาพต้องเป็น URL http หรือ https แบบเต็ม โดยไม่มีชื่อผู้ใช้หรือรหัสผ่าน'; }
}
