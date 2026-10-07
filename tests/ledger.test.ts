import { test, expect } from 'claude-code/testing'
import { UsageLedger, pruneAggregates } from '../lib/ledger'
const usage = {input_tokens:10,output_tokens:2,cache_read_input_tokens:100,cache_creation_input_tokens:5}
const entry = {key:'e/t/main/0',recommended:'opus',requested:'sonnet',answered:'sonnet',usage,durationMs:20}

test('duplicate requests do not multiply tokens', () => {
  const ledger = new UsageLedger(); ledger.record(entry); ledger.record(entry)
  expect(ledger.summary().requests).toBe(1); expect(ledger.summary().tokens.cacheRead).toBe(100)
})
test('missing usage remains unknown and totals disclose incompleteness', () => {
  const ledger = new UsageLedger(); ledger.record({...entry, usage:null})
  expect(ledger.summary().unknownUsage).toBe(1); expect(ledger.summary().complete).toBe(false)
})
test('malformed or partial counts are not silently zeroed', () => {
  const ledger = new UsageLedger(); ledger.record({...entry,usage:{...usage,output_tokens:-1}})
  expect(ledger.summary().unknownUsage).toBe(1)
})
test('a fallback answering model is separate from requested routing', () => {
  const ledger = new UsageLedger(); ledger.record({...entry,requested:'opus',answered:'claude-sonnet-5-5'})
  expect(ledger.summary().mismatches).toBe(1)
})
test('bounded ledger exposes truncation rather than full history', () => {
  const ledger = new UsageLedger(); for(let i=0;i<1001;i++) ledger.record({...entry,key:String(i)})
  expect(ledger.summary().requests).toBe(1000); expect(ledger.summary().evicted).toBe(1)
  expect(ledger.summary().complete).toBe(false)
})
test('aggregate retention rejects malformed data and expired records', () => {
  const now = 40*86400000
  const rows = [{day:0,category:'engineering',requests:1},{day:39*86400000,category:'engineering',requests:2}]
  expect(pruneAggregates(rows,now).length).toBe(1)
  expect(pruneAggregates([{prompt:'secret',day:now}],now).length).toBe(0)
})

test('daily counts survive request ring eviction across days',()=>{
  const ledger=new UsageLedger(),day=1700006400000
  for(let i=0;i<1001;i++) ledger.record({...entry,key:String(i),category:'engineering',timestamp:day})
  expect(ledger.aggregates(day)[0].requests).toBe(1001)
  expect(ledger.aggregateCoverage().mayRepeatEvictedKeys).toBe(true)
  expect(ledger.aggregateCoverage().complete).toBe(false)
  ledger.record({...entry,key:'next',category:'engineering',timestamp:day+86400000})
  expect(ledger.aggregates(day+86400000)[0].requests).toBe(1001)
})
