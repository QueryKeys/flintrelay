import { test, expect } from 'claude-code/testing'
import { RouterState } from '../lib/state'
const complex = {tier:'opus',reason:'complex',category:'engineering'} as const
const ordinary = {tier:'sonnet',reason:'ordinary',category:'engineering'} as const

test('reset revokes ownership and clears stale task choices', () => {
  const state = new RouterState()
  state.enable('claude-sonnet-5-5'); state.startTurn('old', complex); state.reset()
  expect(state.owned).toBe(false); expect(state.decision('old')).toBe(undefined)
})
test('lock revokes pending control and unlock does not reacquire it', () => {
  const state = new RouterState(); state.enable('sonnet'); const before = state.revision
  state.lock(); expect(state.revision > before).toBe(true); expect(state.owned).toBe(false)
  state.unlock(); expect(state.owned).toBe(false)
})
test('concurrent turn IDs do not share recommendations', () => {
  const state = new RouterState(); state.startTurn('a', complex); state.startTurn('b', ordinary)
  expect(state.decision('a')?.tier).toBe('opus'); expect(state.decision('b')?.tier).toBe('sonnet')
})
test('escalation is bounded and applies to the next existing step', () => {
  const state = new RouterState(); state.startTurn('a', ordinary)
  expect(state.escalate('a')).toBe(true); expect(state.escalate('a')).toBe(false)
  expect(state.decision('a')?.tier).toBe('opus')
})
test('a skill taints only its turn, blocking router override', () => {
  const state = new RouterState(); state.startTurn('a', complex); state.markSkill('a')
  expect(state.turn('a')?.blocked).toBe(true)
  state.startTurn('b', complex); expect(state.turn('b')?.blocked).toBe(false)
})
test('turn storage is bounded and eviction abstains', () => {
  const state = new RouterState(); for(let i=0;i<65;i++) state.startTurn(String(i), complex)
  expect(state.decision('0')).toBe(undefined); expect(state.turns.size).toBe(64)
})
test('completed turns cannot authorize late requests', () => {
  const state = new RouterState(); state.startTurn('a',complex); state.complete('a')
  expect(state.decision('a')).toBe(undefined)
})

test('off reset remains off and clears pending skill authority',()=>{
  const state=new RouterState();state.disable('off');state.markSkill();state.reset()
  expect(state.mode).toBe('off');state.startTurn('new',complex);expect(state.turn('new')?.blocked).toBe(false)
})

test('a native switch cannot resume collection after off',()=>{
  const state=new RouterState();state.disable('off');state.lock();expect(state.mode).toBe('off')
})
