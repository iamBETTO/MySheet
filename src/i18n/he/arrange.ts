// Hebrew texts: arranging (plans/translation.md, step 5). Drafted by Claude for the owner to check; keys match en/arrange.ts.
import type { Key } from '../text';
import type { Message } from '../types';

export const arrange = {
  "arrange.open": "סידור {page}",
  "arrange.hiddenCount": { one: "כרטיסייה אחת מוסתרת", other: "{n} כרטיסיות מוסתרות" },
  "arrange.position": "{card}: מקום {at} מתוך {count}.",
  "arrange.heading": "סידור {page}",
  "arrange.helpWide": "אפשר לגרור כרטיסייה בעזרת הידית שלה, או להשתמש בכפתורים שלה. כרטיסיות בחצי רוחב יושבות זו לצד זו; בטלפון הן מוצגות בעמודה אחת באותו סדר.",
  "arrange.helpNarrow": "אפשר לגרור כרטיסייה בעזרת הידית שלה, או להשתמש בכפתורים שלה. במחשב אפשר גם לבחור אילו כרטיסיות יושבות זו לצד זו.",
  "arrange.saved": "הסידור של {page} נשמר",
  "arrange.reset": "חזרה לסידור המקורי",
  "arrange.resetSaid": "הסידור של {page} חזר למקור. כדי לשמור אותו, יש ללחוץ על סיום.",
  "arrange.move": "הזזת {card}",
  "arrange.earlier": "מוקדם יותר",
  "arrange.earlierLabel": "הזזת {card} מוקדם יותר",
  "arrange.later": "מאוחר יותר",
  "arrange.laterLabel": "הזזת {card} מאוחר יותר",
  "arrange.fullWidth": "רוחב מלא",
  "arrange.halfSaid": "{card}: חצי רוחב.",
  "arrange.fullSaid": "{card}: רוחב מלא.",
  "arrange.hide": "הסתרה",
  "arrange.hideLabel": "הסתרת {card}",
  "arrange.hiddenSaid": "הכרטיסייה {card} הוסתרה. היא מופיעה תחת ״כרטיסיות מוסתרות״.",
  "arrange.hiddenCards": "כרטיסיות מוסתרות",
  "arrange.show": "הצגה",
  "arrange.showLabel": "הצגת {card}",
  "arrange.shownSaid": "הכרטיסייה {card} מוצגת שוב.",
  "arrange.keys": "אפשר להזיז את הכרטיסייה בעזרת מקשי החצים למעלה ולמטה, או לגרור אותה.",
} satisfies Partial<Record<Key, Message>>;
