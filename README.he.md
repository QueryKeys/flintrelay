# FlintRelay — גרסת Preview 0.1.1

תוסף קהילתי ל־Claude Code, ברישיון MIT. הוא ממליץ על מודל באמצעות מדיניות מקומית, בלי קריאת מודל נוספת. ברירת המחדל היא תצפית; ניתוב פעיל דורש שליטה מפורשת ומאפשר קידום בלבד.

## התקנה

המנועים שנבדקו הם CLI **2.1.290** ומנוע Desktop ב־macOS **2.1.286**. ל־Desktop מנוע נפרד: שדרוג הטרמינל אינו משדרג אותו. `/router doctor` מציג את גרסת השיחה בפועל. ההתקנה אינה משדרגת את Claude.

```sh
claude plugin marketplace add QueryKeys/flintrelay
claude plugin install flintrelay@querykeys-flintrelay
```

הפעל מחדש את Claude Code. אם נדרשת תצורה, הפעל `/plugin configure flintrelay@querykeys-flintrelay` ואשר את ברירות המחדל הרצויות, ואז:

```text
/router doctor
/router status
```

להענקת שליטה בשיחה הנוכחית: `/router mode active`. לעצירת ניתוב ואיסוף: `/router mode off`. לאיפוס מדדים ושליטה: `/router reset`. שמירה מתמשכת כבויה כברירת מחדל.

איכות וחיסכון בפועל טרם נמדדו. קידום עשוי להגדיל עלות, והמערכת אינה מורידה אוטומטית למודל זול יותר. effort מסוג xhigh/max או מספרי מונע קידום בגרסה זו. מודלים לא מזוהים, בחירות ידניות, Skills וסוכני משנה נשמרים שמרנית.

ראה [תיעוד מלא](README.md), [ראיות בדיקה](docs/validation.md), [פרטיות](PRIVACY.md), [מחקר](docs/research.md) ו־[רישיון](LICENSE). חבילת גרסה קבועה זמינה ב־[Releases](https://github.com/QueryKeys/flintrelay/releases).
