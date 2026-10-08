/**
 * Plain-language task signals (English and Hebrew), matched against lower-cased text.
 * Deterministic local heuristics only: they suggest effort and a model floor and do not
 * measure task difficulty or answer quality. English words use \b; Hebrew uses substrings.
 */
export const HARD_PLAIN = /\b(keeps? (crashing|failing|breaking|freezing)|at random|randomly|intermittent(ly)?|sometimes fails?|memory leaks?|data loss|lost data|lose data|losing data|corrupt(ed|ion)?|outage|production is down|redesign|from scratch|rewrite the (whole|entire))\b|(אקראי|לפעמים נכשל|נכשלת לפעמים|לפעמים קורס|דליפ(ת|ות) (ה)?זיכרון|איבד(ו)? נתונים|אובדן (ה)?נתונים|נתונים אבדו|מאפס|נבנה מחדש|לבנות מחדש|תבנה מחדש|בנה מחדש|לתכנן מחדש|תכנון מחדש|השבתה)/u
export const DEBUG_PLAIN = /\b(not working|doesn'?t work|does not work|isn'?t working|won'?t (start|load|build|run|compile)|broken|crash(es|ed|ing)?|fails?|failing|failed|errors?|exceptions?|bugs?|stack ?trace|figure out why)\b|(לא עובד|לא עובדת|לא עובדים|נשבר|שבור|קורס|קורסת|נכשל|תקלה|באג|שגיאה|חריגה)/u
export const ORDINARY_PLAIN = /\b(add|update|change|create|write|remove|delete|replace|install|configure|improve|refactor|implement|build|set up|make (the|a|an|it|this|that))\b|(תוסיף|תוסיפו|הוסף|תעדכן|עדכן|תשנה|שנה את|תיצור|צור |תכתוב|כתוב|תבנה|תסדר|סדר |תשפר|שפר|תמחק|מחק את|תחליף|תגדיר|תתקין|תממש)/u
export const MECHANICAL_PLAIN = /\b(typos?|rename|re-?format|translate|summari[sz]e|spell(ing)? ?check|fix (the )?spelling)\b|(שגיאת כתיב|טעות כתיב|שנה שם|תסכם|סכם|תתרגם|תרגם)/u
export const DEEP_PLAIN = /\b(thorough(ly)?|in[- ]depth|really dig|very carefully)\b|(בעומק|ביסודיות|מעמיק)/u
