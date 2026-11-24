// Builds tests/fixtures/demo-hebrew.json: the demo person with Hebrew names (types, accounts, shops, notes, holdings),
// for checking that Hebrew and English sit together correctly (phone, Hebrew and accessibility testing, 6 Nov 2026).
// Mixed on purpose: some shops keep Latin letters and digits inside Hebrew ("WOLT וולט", "סלקום 052").
// Run: node scripts/build-hebrew-demo.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const demo = JSON.parse(readFileSync(new URL('../src/model/demo.json', import.meta.url), 'utf8'));
const CATEGORIES = { Shopping: 'קניות', Scooters: 'קורקינטים', Rent: 'שכירות', 'Eating out': 'אוכל בחוץ', Groceries: 'סופר', Subscriptions: 'מנויים', Salary: 'משכורת', 'Public transport': 'תחבורה ציבורית', 'Moved to savings': 'הועבר לחיסכון', Bills: 'חשבונות', 'From family': 'ממשפחה', 'ATM cash': 'מזומן מכספומט', 'Tax refund': 'החזר מס', Bonus: 'בונוס', 'Card payments': 'חיובי כרטיס', 'Card (no details)': 'כרטיס (בלי פירוט)' };
const ACCOUNTS = { 'Bank account': 'חשבון בנק', Card: 'כרטיס אשראי' };
const SHOPS = {
  'CARD CHARGE': 'חיוב כרטיס אשראי', 'Scooter rides': 'LIME קורקינט', 'City Market': 'שופרסל דיל', 'Neighborhood Grocer': 'מכולת השכונה בע"מ',
  'Fresh Market': 'רמי לוי שיווק השקמה 2006', 'Sushi Bar': 'WOLT וולט', 'Pizza Place': 'פיצה האט 24/7', 'Burger Joint': 'BBB בורגר',
  'Falafel Stand': 'פלאפל הזקן', 'Corner Café': 'קפה קפה (תל אביב)', 'Salary · Example Ltd': 'משכורת · דוגמה בע"מ', 'Bus pass top-up': 'רב-קו טעינה',
  'Music app': 'Spotify ספוטיפיי', 'Video streaming': 'NETFLIX נטפליקס', 'Rent · Landlord': 'שכר דירה · משה כהן', 'Phone · Mobile Co.': 'סלקום 052',
  'Internet · Home Net': 'בזק אינטרנט 1-800', 'Transfer to savings account': 'העברה לחשבון חיסכון', 'ATM withdrawal': 'משיכת מזומן כספומט',
  'Clothing shop': 'קסטרו CASTRO', 'Electronics shop': 'KSP מחשבים', 'Online store': 'AliExpress עלי אקספרס', 'Electricity · Power Co.': 'חברת החשמל לישראל',
  'Gift from family': 'מתנה מההורים', 'Year-end bonus · Example Ltd': 'בונוס שנתי · דוגמה בע"מ', 'Tax refund': 'החזר מס הכנסה',
};
const NOTES = { 'Saving push: no eating out': 'חודש חיסכון: בלי אוכל בחוץ', 'Trip to Eilat': 'טיול לאילת', 'Car service': 'טיפול 30,000 ק"מ', "Mom's birthday dinner": 'ארוחת יום הולדת לאמא', 'Phone and internet bills due': 'חשבונות טלפון ואינטרנט' };
const HOLDINGS = { 'Savings account': 'פיקדון חיסכון', 'Pension fund': 'קרן פנסיה מגדל', 'Study fund': 'קרן השתלמות', 'Index fund': 'קרן מחקה S&P 500', 'Crypto wallet': 'ארנק קריפטו', Car: 'מאזדה 3', 'Plot of land': 'מגרש בגיאורגיה', 'Car loan': 'הלוואת רכב' };
const he = (map, v) => map[v] ?? v;

for (const c of demo.categories) c.name = he(CATEGORIES, c.name);
for (const a of demo.accounts) a.name = he(ACCOUNTS, a.name);
for (const n of demo.notes) n.text = he(NOTES, n.text);
for (const h of demo.holdings) h.name = he(HOLDINGS, h.name);
let i = 0;
for (const m of Object.values(demo.months)) for (const t of m.transactions) {
  t.description = he(SHOPS, t.description);
  if (++i % 97 === 0) t.note = 'הערה: לבדוק עם הבנק (ref 4471)';
}
writeFileSync(new URL('../tests/fixtures/demo-hebrew.json', import.meta.url), JSON.stringify(demo));
console.log('demo-hebrew.json written');
