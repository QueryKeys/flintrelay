import { test, expect } from 'claude-code/testing'
import { classify, modelFamily, parseOptions, promote } from '../lib/policy'

test('short difficult tasks are not routed as cheap', () => {
  expect(classify('Design a new architecture', 'balanced').tier).toBe('opus')
  expect(classify('תקן race condition', 'balanced').tier).toBe('opus')
  expect(classify('תכנן ארכיטקטורה למערכת חדשה', 'balanced').tier).toBe('opus')
})
test('mechanical work is a recommendation, not an automatic downgrade', () => {
  expect(classify('Format this JSON exactly; preserve every key', 'balanced').tier).toBe('haiku')
  expect(promote('claude-opus-5-5', 'haiku', 'high', ['sonnet','opus'])).toBe(null)
  expect(promote('claude-sonnet-5-5', 'haiku', 'high', ['sonnet','opus'])).toBe(null)
})
test('mixed and ambiguous tasks abstain', () => {
  expect(classify('Format JSON, then design a new architecture', 'balanced').tier).toBe('opus')
  expect(classify('עשה את זה', 'balanced').tier).toBe('keep')
  expect(classify('', 'quality').tier).toBe('keep')
})
test('recognized native IDs exclude unknown and expanded context models', () => {
  expect(modelFamily('claude-sonnet-5-5')).toBe('sonnet')
  expect(modelFamily('claude-opus-4-6')).toBe('opus')
  expect(modelFamily('claude-haiku-4-5-20251001')).toBe('haiku')
  expect(modelFamily('claude-sonnet-5-5[1m]')).toBe(null)
  expect(modelFamily('vendor-sonnet-custom')).toBe(null)
})
test('promotions require a permitted family and preserve effort compatibility', () => {
  expect(promote('claude-sonnet-5-5', 'opus', 'high', ['opus'])).toBe('opus')
  expect(promote('claude-sonnet-5-5', 'opus', 'max', ['opus'])).toBe(null)
  expect(promote('claude-sonnet-5-5', 'opus', 'high', ['sonnet'])).toBe(null)
  expect(promote('claude-opus-5-5', 'sonnet', 'high', ['sonnet'])).toBe(null)
})
test('invalid configuration cannot authorize active routing', () => {
  expect(parseOptions({}).valid).toBe(true)
  expect(parseOptions({mode:'active'}).valid).toBe(false)
  expect(parseOptions({profile:'typo'}).valid).toBe(false)
  expect(parseOptions({allowed_models:'haiku,opus'}).valid).toBe(false)
  expect(parseOptions({persist_metrics:'true'}).valid).toBe(false)
  expect(parseOptions({unexpected:true}).valid).toBe(false)
})

test('migration verbs use the sensitive engineering floor',()=>{
  expect(classify('Migrate the persisted configuration without losing overrides','balanced').tier).toBe('opus')
})

test('effort option defaults to auto, accepts preserve and rejects malformed policies',()=>{
  expect(parseOptions({}).effortPolicy).toBe('auto')
  expect(parseOptions({effort_policy:'preserve'}).effortPolicy).toBe('preserve')
  expect(parseOptions({effort_policy:'max'}).valid).toBe(false)
  expect(classify('Format this JSON then fix this bug','balanced').effort).toBe('high')
  expect(classify('עשה את זה','quality').effort).toBe('keep')
})

test('plain-language hard problems are recognized in English and Hebrew', () => {
  for (const text of ['The checkout keeps crashing at random, figure out why', 'we have a memory leak somewhere', 'users lost data after the update', 'let us redesign the whole thing from scratch', 'הבדיקה נכשלת לפעמים בצורה אקראית', 'יש דליפת זיכרון באפליקציה', 'המשתמשים איבדו נתונים אחרי העדכון', 'בוא נבנה מחדש את כל המערכת מאפס']) {
    expect([text, classify(text, 'balanced').tier]).toEqual([text, 'opus'])
    expect([text, classify(text, 'balanced').effort]).toEqual([text, 'high'])
  }
})
test('plain-language everyday engineering requests are recognized', () => {
  for (const text of ['can you add a login button to the page', 'please update the readme with the new steps', 'make the header sticky', 'תוסיף כפתור התחברות לדף', 'תעדכן את הקובץ עם הצעדים החדשים', 'תסדר את עניין הנתונים']) {
    expect([text, classify(text, 'balanced').tier]).toEqual([text, 'sonnet'])
    expect([text, classify(text, 'balanced').effort]).toEqual([text, 'medium'])
  }
  for (const text of ['it is not working, please fix it', 'the build is broken and fails on CI', 'זה לא עובד, תתקן', 'האפליקציה קורסת כשלוחצים על שמירה']) {
    expect([text, classify(text, 'balanced').tier]).toEqual([text, 'sonnet'])
    expect([text, classify(text, 'balanced').effort]).toEqual([text, 'high'])
  }
})
test('plain-language bounded chores are low-effort mechanical candidates', () => {
  for (const text of ['fix the typo in the title', 'rename this variable to count', 'תקן שגיאת כתיב בכותרת', 'תסכם את הקובץ הזה']) {
    expect([text, classify(text, 'balanced').tier]).toEqual([text, 'haiku'])
    expect([text, classify(text, 'balanced').effort]).toEqual([text, 'low'])
  }
})
test('chatter, acknowledgements and questions stay unclassified', () => {
  for (const text of ['ok thanks', 'continue', 'yes', 'what time is it', 'hello there', 'כן', 'תודה', 'תן לזה מה שצריך', 'מה אתה חושב?', 'address the previous point']) {
    expect([text, classify(text, 'balanced').tier]).toEqual([text, 'keep'])
    expect([text, classify(text, 'balanced').effort]).toEqual([text, 'keep'])
  }
})
test('deep plain-language wording raises sensitive work to xhigh', () => {
  expect(classify('please look into this memory leak very thoroughly', 'balanced').effort).toBe('xhigh')
  expect(classify('תבדוק את דליפת הזיכרון הזו בעומק', 'balanced').effort).toBe('xhigh')
})
