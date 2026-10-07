// Development-only microbenchmark. This never invokes Claude or a model.
import {classify} from '../lib/policy.ts'
const samples=[]
const prompts=['Design a new architecture','Format this JSON exactly; preserve every key','עשה את זה כמו קודם','Migrate the persisted configuration without losing overrides']
const maximumInput=99990
for(let i=0;i<100;i++) classify(prompts[i%prompts.length],'balanced')
for(let i=0;i<1000;i++) {
  const head=prompts[i%prompts.length]
  const text=i%5===0 ? head+' '.repeat(maximumInput-head.length) : head
  const start=performance.now();classify(text,'balanced');samples.push(performance.now()-start)
}
samples.sort((a,b)=>a-b)
console.log(JSON.stringify({scope:'local classifier only; excludes native waits, inference, quality and cost',samples:samples.length,maximumInputCharacters:maximumInput,p50Ms:samples[499],p95Ms:samples[949],maximumMs:samples[999],node:process.version,platform:process.platform,architecture:process.arch},null,2))
