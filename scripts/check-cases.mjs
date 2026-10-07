// Development-only: Node 24 can load the erasable TypeScript policy directly.
import {readFileSync} from 'node:fs'
import {classify} from '../lib/policy.ts'
const specification=JSON.parse(readFileSync(new URL('../evaluation/cases.json',import.meta.url),'utf8'))
const results=specification.cases.map(test=>({id:test.id,expected:test.shadowRecommendation,actual:classify(test.prompt,'balanced').tier}))
console.log(JSON.stringify({scope:'deterministic classification only; no inference or quality measurement',passed:results.filter(row=>row.expected===row.actual).length,total:results.length,results},null,2))
if(results.some(row=>row.expected!==row.actual)) process.exitCode=1
