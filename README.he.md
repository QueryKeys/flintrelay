<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/branding/flintrelay-logo-dark.png">
    <img src="assets/branding/flintrelay-logo.png" alt="FlintRelay — ניתוב מודלים ו־Effort ל־Claude Code" width="480">
  </picture>
</p>

# FlintRelay — גרסת Preview 0.2.0

תוסף קהילתי ל־Claude Code, ברישיון MIT. הוא ממליץ על מודל ו־Effort באמצעות מדיניות מקומית, בלי קריאת מודל נוספת. ברירת המחדל היא תצפית; ניתוב פעיל דורש שליטה מפורשת ומאפשר קידום מודל והתאמת Effort מעלה ומטה.

## סרטון סקירה של 30 שניות

[![FlintRelay ב־30 שניות: סרטון סקירה](docs/media/flintrelay-overview-poster.jpg)](docs/media/flintrelay-overview.mp4)

[צפייה בסרטון](docs/media/flintrelay-overview.mp4) (30 שניות, קריינות באנגלית עם כתוביות). הוא מציג מה FlintRelay עושה ומה לא: ממליץ על מודל ו־Effort לכל משימה, בלי gateway, בלי בקשת classifier נוספת ובלי SDK להסקה, ומתחיל במצב תצפית עד שמפעילים ניתוב פעיל.

## התקנה

המנועים שנבדקו הם CLI **2.1.290**, **2.1.293** ומנוע Desktop ב־macOS **2.1.286**. ל־Desktop מנוע נפרד: שדרוג הטרמינל אינו משדרג אותו. `/router doctor` מציג את גרסת השיחה בפועל. ההתקנה אינה משדרגת את Claude.

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

איכות וחיסכון בפועל טרם נמדדו. קידום עשוי להגדיל עלות, והמערכת אינה מורידה אוטומטית למודל זול יותר. במצב Auto ניתן להחליף גם ברירת מחדל `xhigh` או `max`; תקציב מספרי פנימי נשמר. מודלים לא מזוהים, בחירות ידניות, Skills וסוכני משנה נשמרים שמרנית.

ראה [תיעוד מלא](README.md), [ראיות בדיקה](docs/validation.md), [פרטיות](PRIVACY.md), [מחקר](docs/research.md) ו־[רישיון](LICENSE). חבילת גרסה קבועה זמינה ב־[Releases](https://github.com/QueryKeys/flintrelay/releases).

## התאמת Effort

במצב Active, ברירת המחדל `effort_policy=auto` מתאימה Effort לכל משימה שזוהתה:

| משימה | Effort מומלץ |
| --- | --- |
| עיצוב נתונים, חילוץ שדות או סיכום מוגבל | `low` |
| מימוש תכונה, פונקציה או בדיקה רגילה | `medium` |
| דיבוג, ארכיטקטורה, אבטחה או מיגרציה | `high` |
| ניתוח מעמיק של ארכיטקטורה או עבודה רגישה | `xhigh` במודל תואם; אחרת `high` |
| הוראה עמומה או ריקה | שימור הערך הנכנס |

Claude מחיל את מגבלות המודל והארגון. שינוי מודל דרך כינוי משתמש לכל היותר ב־`high`, משום שהכינוי יכול להתמפות לגרסאות שונות. `max` לא נבחר אוטומטית. זו מדיניות המבוססת על כללים; איכות וחיסכון טרם כוילו בניסוי.

`/router effort preserve` משמר Effort; `/router effort auto` מחזיר התאמה אוטומטית. בחירה דרך `/effort` מפעילה שימור לשיחה ועוברת ל־Claude. API הבקשה אינו חושף אם ערך התחלתי הגיע מ־`--effort`, משתנה סביבה או הגדרה שמורה: כדי לשמר אותם בחר Preserve. ההגדרות הגלובליות אינן משתנות.

ב־Shadow מוצגת המלצה בלבד. `/router report` סופר Effort שהתוסף ביקש; Effort שבוצע בפועל אינו נחשף, ויכול להשתנות בגלל מגבלות Claude או תוספים אחרים.
