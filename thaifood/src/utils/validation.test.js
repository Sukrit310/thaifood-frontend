import { unicodeLength, utf8ByteLength, validateNewPassword, validateCurrentPassword, validateDisplayName, validateImageUrl } from './validation';
test('password validation matches Go UTF-8 byte boundaries', () => {
  expect(utf8ByteLength('ก😀a')).toBe(8);
  expect(validateNewPassword('กกก')).toBe('');
  expect(validateNewPassword('ก'.repeat(24))).toBe('');
  expect(validateNewPassword('ก'.repeat(25))).not.toBe('');
  expect(validateNewPassword('a'.repeat(7))).not.toBe('');
  expect(validateNewPassword('a'.repeat(72))).toBe('');
  expect(validateCurrentPassword('a')).toBe('');
  expect(validateCurrentPassword('')).not.toBe('');
});
test('display names count Unicode code points instead of UTF-16 units', () => {
  expect(unicodeLength('😀ก')).toBe(2);
  expect(validateDisplayName('😀'.repeat(100))).toBe('');
  expect(validateDisplayName('😀'.repeat(101))).not.toBe('');
  expect(validateDisplayName('  ')).not.toBe('');
});
test('image URLs match Go absolute HTTP(S) and byte constraints', () => {
  expect(validateImageUrl(null)).toBe('');
  expect(validateImageUrl('https://example.com/food.jpg')).toBe('');
  for (const value of ['/images/food.svg', '//example.com/food.jpg', 'javascript:alert(1)', 'https://user:password@example.com/a', `https://example.com/${'ก'.repeat(700)}`]) expect(validateImageUrl(value)).not.toBe('');
});
