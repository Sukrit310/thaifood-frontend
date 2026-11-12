// All restaurant/member/review content below is fictional demonstration data.
// Images are original local illustrations supplied by this project.
const names = ['เชียงใหม่','กรุงเทพมหานคร','ขอนแก่น','ภูเก็ต','พระนครศรีอยุธยา','กระบี่','กาญจนบุรี','กาฬสินธุ์','กำแพงเพชร','จันทบุรี','ฉะเชิงเทรา','ชลบุรี','ชัยนาท','ชัยภูมิ','ชุมพร','เชียงราย','ตรัง','ตราด','ตาก','นครนายก','นครปฐม','นครพนม','นครราชสีมา','นครศรีธรรมราช','นครสวรรค์','นนทบุรี','นราธิวาส','น่าน','บึงกาฬ','บุรีรัมย์','ปทุมธานี','ประจวบคีรีขันธ์','ปราจีนบุรี','ปัตตานี','พะเยา','พังงา','พัทลุง','พิจิตร','พิษณุโลก','เพชรบุรี','เพชรบูรณ์','แพร่','มหาสารคาม','มุกดาหาร','แม่ฮ่องสอน','ยโสธร','ยะลา','ร้อยเอ็ด','ระนอง','ระยอง','ราชบุรี','ลพบุรี','ลำปาง','ลำพูน','เลย','ศรีสะเกษ','สกลนคร','สงขลา','สตูล','สมุทรปราการ','สมุทรสงคราม','สมุทรสาคร','สระแก้ว','สระบุรี','สิงห์บุรี','สุโขทัย','สุพรรณบุรี','สุราษฎร์ธานี','สุรินทร์','หนองคาย','หนองบัวลำภู','อ่างทอง','อำนาจเจริญ','อุดรธานี','อุตรดิตถ์','อุทัยธานี','อุบลราชธานี'];
const regions = {
  ภาคเหนือ: ['เชียงใหม่','เชียงราย','ลำปาง','ลำพูน','แม่ฮ่องสอน','น่าน','พะเยา','แพร่','อุตรดิตถ์'],
  ภาคตะวันออกเฉียงเหนือ: ['ขอนแก่น','กาฬสินธุ์','ชัยภูมิ','นครพนม','นครราชสีมา','บึงกาฬ','บุรีรัมย์','มหาสารคาม','มุกดาหาร','ยโสธร','ร้อยเอ็ด','เลย','ศรีสะเกษ','สกลนคร','สุรินทร์','หนองคาย','หนองบัวลำภู','อำนาจเจริญ','อุดรธานี','อุบลราชธานี'],
  ภาคใต้: ['กระบี่','ชุมพร','ตรัง','นครศรีธรรมราช','นราธิวาส','ปัตตานี','พังงา','พัทลุง','ภูเก็ต','ยะลา','ระนอง','สงขลา','สตูล','สุราษฎร์ธานี'],
  ภาคตะวันออก: ['จันทบุรี','ฉะเชิงเทรา','ชลบุรี','ตราด','ปราจีนบุรี','ระยอง','สระแก้ว'],
  ภาคตะวันตก: ['กาญจนบุรี','ตาก','ประจวบคีรีขันธ์','เพชรบุรี','ราชบุรี'],
};
export const provinces = names.map((nameTh, index) => ({ id: index + 1, nameTh, region: Object.keys(regions).find(region => regions[region].includes(nameTh)) || 'ภาคกลาง' }));
export const categories = ['อาหารเหนือ','อาหารอีสาน','อาหารไทย','อาหารทะเล','คาเฟ่','อาหารใต้'].map((nameTh, index) => ({ id: index + 1, nameTh }));

// A deterministic digest is sufficient only for this public browser mock. Real
// passwords/authentication are handled exclusively by Go (bcrypt + signed JWT).
export function mockPasswordDigest(password) {
  let hash1 = 2166136261;
  let hash2 = 5381;
  for (const char of String(password)) {
    hash1 = Math.imul(hash1 ^ char.codePointAt(0), 16777619);
    hash2 = Math.imul(hash2, 33) ^ char.codePointAt(0);
  }
  return `mock-only:${(hash1 >>> 0).toString(16)}:${(hash2 >>> 0).toString(16)}`;
}

const restaurantSeeds = [
  ['ข้าวซอยริมสวน',1,1,'ข้าวซอยไก่ น้ำแกงหอมเครื่องเทศ พร้อมผักดองและหอมแดง','noodles'],
  ['ครัวม่วนใจ๋',1,1,'สำรับเมืองเหนือ น้ำพริกหนุ่ม ผักนึ่ง และแกงฮังเล','rice'],
  ['บ้านใบชา',1,5,'คาเฟ่ในสวนเล็ก เสิร์ฟชาไทยและขนมทำเอง','cafe'],
  ['ก๋วยเตี๋ยวตรอกเก่า',1,3,'ก๋วยเตี๋ยวน้ำซุปเคี่ยว รสกลมกล่อมในบรรยากาศสบาย','soup'],
  ['สำรับบางกอก',2,3,'อาหารไทยรสคุ้นเคย ข้าวหอมมะลิและกับข้าวตามฤดูกาล','rice'],
  ['เส้นสายย่านเก่า',2,3,'ผัดไทยเส้นจันท์และก๋วยเตี๋ยวสูตรครัวบ้าน','noodles'],
  ['กาแฟริมคลอง',2,5,'กาแฟคั่วกลางและขนมไทย เหมาะกับการพักระหว่างวัน','cafe'],
  ['ครัวหอมกะเพรา',2,3,'กะเพราพริกแห้งหอมกระทะและไข่ดาวกรอบ','rice'],
  ['ตำม่วนริมบึง',3,2,'ส้มตำ ลาบ และข้าวเหนียวนึ่งใหม่ รสจัดตามสั่ง','rice'],
  ['ลาบบ้านเฮา',3,2,'ลาบสมุนไพร ต้มแซ่บ และไก่ย่างหมักเครื่องเทศ','soup'],
  ['ข้าวจี่และกาแฟ',3,5,'ข้าวจี่อุ่นและกาแฟท้องถิ่นในร้านเล็กแสนอบอุ่น','cafe'],
  ['ครัวแซ่บอีสาน',3,2,'อ่อมผักตามฤดูกาลและอาหารพื้นบ้านอีสาน','soup'],
  ['ครัวเลเมืองเก่า',4,4,'อาหารทะเลปรุงสดและรสชาติท้องถิ่นในย่านเมืองเก่า','soup'],
  ['บ้านเครื่องแกง',4,6,'แกงใต้เครื่องเข้ม ผักสด และข้าวสวยร้อน','rice'],
  ['เส้นหมี่ริมเล',4,6,'หมี่ผัดและน้ำซุปหอมพริกไทยในบรรยากาศสบาย','noodles'],
  ['ก๋วยเตี๋ยวบ้านอิฐ',5,3,'ก๋วยเตี๋ยวเรือน้ำเข้มและเครื่องเคียงทำเอง','noodles'],
  ['ครัวริมน้ำเจ้าพระยา',5,3,'สำรับไทย ข้าวปลาแกะ และต้มยำสมุนไพร','soup'],
  ['บ้านขนมกรุงเก่า',5,5,'ขนมไทย กาแฟ และมุมพักผ่อนระหว่างเที่ยวเมืองเก่า','cafe'],
];
const positions = { 1: [18.788,98.985], 2: [13.756,100.502], 3: [16.441,102.835], 4: [7.881,98.392], 5: [14.353,100.569] };

export function createSeedData() {
  const passwordDigest = mockPasswordDigest('ExamplePassword123');
  const members = [
    { id: 1, email: 'demo@example.com', displayName: 'นักชิมตัวอย่าง', role: 'member', passwordDigest },
    { id: 2, email: 'admin@example.com', displayName: 'ผู้ดูแลตัวอย่าง', role: 'admin', passwordDigest },
    { id: 3, email: 'traveler@example.com', displayName: 'นักชิมเดินทาง', role: 'member', passwordDigest },
    { id: 4, email: 'local@example.com', displayName: 'คนชอบอาหารไทย', role: 'member', passwordDigest },
  ];
  const restaurants = restaurantSeeds.map(([name,provinceId,categoryId,description,image], index) => ({ id: 101 + index, name, province: provinces.find(p => p.id === provinceId).nameTh, category: categories.find(c => c.id === categoryId).nameTh, address: `ย่านใจกลาง${provinces.find(p => p.id === provinceId).nameTh} (ที่อยู่สมมติ)`, description: `${description} — ร้านสมมติสำหรับทดลองใช้งาน ThaiFood Guide`, latitude: positions[provinceId][0], longitude: positions[provinceId][1], imageUrl: `/images/food-${image}.svg` }));
  const reviews = restaurants.slice(0, 12).flatMap((restaurant, index) => [
    { id: index * 2 + 1, restaurantId: restaurant.id, memberId: 3, rating: index % 3 === 0 ? 5 : 4, text: 'อาหารรสชาติดี บรรยากาศสบาย เหมาะกับการมาทานด้วยกัน', createdAt: '2026-11-11T08:00:00Z' },
    { id: index * 2 + 2, restaurantId: restaurant.id, memberId: 4, rating: 5, text: 'ชอบรสชาติอาหารและการบริการ อยากกลับมาลองเมนูอื่นอีกครั้ง', createdAt: '2026-11-11T10:30:00Z' },
  ]);
  return { version: 2, restaurants, members, reviews, favorites: [{ memberId: 1, restaurantId: 101 }, { memberId: 1, restaurantId: 105 }], sessions: {}, nextMemberId: 5, nextRestaurantId: 119, nextReviewId: 25 };
}
