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
