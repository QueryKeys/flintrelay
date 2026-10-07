import { test, expect } from 'claude-code/testing'
import { handleCommand } from '../lib/commands'
import { RouterState } from '../lib/state'

test('plugin and peer commands cannot acquire routing ownership', () => {
  for (const origin of ['plugin','peer','sdk','unclassified']) {
    const state=new RouterState()
    const result=handleCommand(state,'mode active',origin,'sonnet',true)
    expect(state.owned).toBe(false); expect(result.text.includes('trusted user')).toBe(true)
  }
})
test('active requires tested host and explicit user control', () => {
  const state=new RouterState()
  handleCommand(state,'mode active','composer','sonnet',false); expect(state.owned).toBe(false)
  handleCommand(state,'mode active','composer','sonnet',true); expect(state.owned).toBe(true)
  handleCommand(state,'lock','composer','sonnet',true); expect(state.owned).toBe(false)
  handleCommand(state,'unlock','composer','sonnet',true); expect(state.owned).toBe(false)
})
test('unknown commands do not mutate state', () => {
  const state=new RouterState(); const before=state.revision
  handleCommand(state,'mode typo','composer','sonnet',true)
  expect(state.revision).toBe(before)
})
