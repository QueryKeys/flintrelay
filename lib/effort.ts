export type Effort = 'low'|'medium'|'high'|'xhigh'
export type EffortPolicy = 'auto'|'preserve'
export type EffortRecommendation = Effort|'keep'

import { HARD_PLAIN, DEBUG_PLAIN, ORDINARY_PLAIN, MECHANICAL_PLAIN, DEEP_PLAIN } from './signals.ts'

/** Bounded local heuristics; effort is a compute budget, not measured quality. */
export function recommendEffort(text:string): EffortRecommendation {
  const task=text.slice(0,100_000).toLowerCase().trim()
  const sensitive=/(architectur|race condition|deadlock|concurrenc|security|authoriz|authenticat|migrat|root cause|ארכיטקט|אבטח|הרשא|אימות משתמש|שורש הבעיה|תנאי מרוץ|מקביליות|מיגרציה)/u.test(task) || HARD_PLAIN.test(task)
  const deep=/(deep|comprehensive|distributed|multi.service|ultrathink|מעמיק|מקיף|מבוזר)/u.test(task) || DEEP_PLAIN.test(task)
  if(sensitive && deep) return 'xhigh'
  if(sensitive || /(debug|fix (the |this |a )?(bug|test)|investigat|deep research|תקן.*(באג|בדיקה)|דבג|חקור|מחקר מעמיק)/u.test(task) || DEBUG_PLAIN.test(task)) return 'high'
  if(/(implement|add (a |an |the )?(feature|function|test|endpoint)|build.*(feature|component)|ממש|הוסף.*(פונקציה|בדיקה|תכונה))/u.test(task) || ORDINARY_PLAIN.test(task)) return 'medium'
  if(/(format (this |the )?(json|csv)|extract (only |the )?(fields|values)|summarize (this|the following)|עצב.*json|חלץ.*(שדות|ערכים)|סכם את)/u.test(task) || MECHANICAL_PLAIN.test(task)) return 'low'
  return 'keep'
}

/** Exact known effort-capable IDs only. Alias rewrites use common levels. */
export function selectEffort(model:string,requested:EffortRecommendation,incoming:unknown,promoted=false): Effort|null {
  if(requested==='keep' || typeof incoming==='number') return null
  const id=model.replace(/^claude-/,'').replace(/-\d{8}$/,'')
  const modern=/^(?:(?:opus|sonnet)-(?:5(?:-5)?)|opus-4-[78])$/.test(id)
  const legacy=/^(?:opus|sonnet)-4-6$/.test(id)
  // Haiku 5.5 requires a newer host than the two engines admitted here.
  const alias=/^(opus|sonnet|haiku)$/.test(id) && (promoted || ['low','medium','high','xhigh','max'].includes(incoming as string))
  if(!modern && !legacy && !alias) return null
  return requested==='xhigh' && !modern ? 'high' : requested
}
