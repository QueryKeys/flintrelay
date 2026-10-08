import { recommendEffort } from './effort.ts'
import type { EffortPolicy, EffortRecommendation } from './effort.ts'
export type Tier = 'haiku' | 'sonnet' | 'opus'
export type Profile = 'balanced' | 'quality'
export type Mode = 'off' | 'shadow' | 'active'
export type Recommendation = { tier: Tier | 'keep'; reason: string; category: string; effort?: EffortRecommendation }
export type RouterConfig = { mode: 'off' | 'shadow'; profile: Profile; allowed: Tier[]; persist: boolean; effortPolicy: EffortPolicy; valid: boolean; errors: string[] }
export const POLICY_VERSION = '0.2.0'
export const TESTED_HOSTS = ['2.1.286', '2.1.290', '2.1.293'] as const
const rank: Record<Tier, number> = { haiku: 0, sonnet: 1, opus: 2 }

export function parseOptions(input: Record<string, unknown> = {}): RouterConfig {
  const errors: string[] = []
  const keys = ['mode','profile','allowed_models','persist_metrics','effort_policy']
  for (const key of Object.keys(input)) if (!keys.includes(key)) errors.push('unknown option')
  const mode = input.mode ?? 'shadow'
  const profile = input.profile ?? 'balanced'
  const raw = input.allowed_models ?? 'sonnet,opus'
  const persist = input.persist_metrics ?? false
  const effortPolicy = input.effort_policy ?? 'auto'
  if (effortPolicy !== 'auto' && effortPolicy !== 'preserve') errors.push('invalid effort policy')
  if (mode !== 'off' && mode !== 'shadow') errors.push('invalid startup mode')
  if (profile !== 'balanced' && profile !== 'quality') errors.push('invalid profile')
  if (typeof persist !== 'boolean') errors.push('invalid persistence option')
  const allowed = typeof raw === 'string' ? raw.split(',').map(s => s.trim()) : []
  if (!allowed.length || allowed.some(s => s !== 'sonnet' && s !== 'opus')) errors.push('invalid allowed families')
  return {mode: errors.length || mode === 'off' ? 'off' : 'shadow', profile: profile === 'quality' ? 'quality' : 'balanced', allowed: [...new Set(allowed)] as Tier[], persist: persist === true && !errors.length, effortPolicy: effortPolicy === 'preserve' ? 'preserve' : 'auto', valid: !errors.length, errors}
}

export function classify(text: string, profile: Profile): Recommendation {
  return {...classifyModel(text,profile),effort:recommendEffort(text)}
}
function classifyModel(text: string, profile: Profile): Recommendation {
  // Classification is advisory. Only explicit session ownership permits promotion.
  const normalized = text.slice(0, 100_000).toLowerCase().trim()
  if (!normalized) return {tier:'keep',reason:'empty-task',category:'unknown'}
  if (/(architectur|race condition|deadlock|concurrenc|security|authoriz|authenticat|migrat|root cause|ארכיטקט|אבטח|הרשא|אימות משתמש|שורש הבעיה|תנאי מרוץ|מקביליות|מיגרציה)/u.test(normalized))
    return {tier:'opus',reason:'complex-or-sensitive',category:'engineering'}
  if (profile === 'quality') return {tier:'opus',reason:'quality-profile',category:'explicit-profile'}
  if (/(format (this |the )?(json|csv)|extract (only |the )?(fields|values)|summarize (this|the following)|עצב.*json|חלץ.*(שדות|ערכים)|סכם את)/u.test(normalized))
    return {tier:'haiku',reason:'bounded-mechanical-candidate',category:'mechanical'}
  if (/(implement|add (a |an |the )?(feature|function|test|endpoint)|fix (the |this |a )?(bug|test)|build.*(feature|component)|ממש|הוסף.*(פונקציה|בדיקה|תכונה)|תקן.*(באג|בדיקה))/u.test(normalized))
    return {tier:'sonnet',reason:'ordinary-engineering',category:'engineering'}
  return {tier:'keep',reason:'insufficient-task-evidence',category:'unknown'}
}

export function modelFamily(model: string): Tier | null {
  // Avoid guessing third-party IDs, future naming schemes, or window modifiers.
  const match = /^(?:claude-)?(haiku|sonnet|opus)(?:-(?:4|5)(?:-[0-9]+)?(?:-[0-9]{8})?)?$/.exec(model)
  return match ? match[1] as Tier : null
}

export function promote(model: string, requested: Tier | 'keep', effort: unknown, allowed: readonly Tier[]): string | null {
  const current = modelFamily(model)
  if (!current || requested === 'keep' || rank[requested] <= rank[current] || !allowed.includes(requested)) return null
  // Universally conservative common effort levels; model aliases can be remapped.
  if (effort !== undefined && !['low','medium','high'].includes(effort as string)) return null
  return requested
}
