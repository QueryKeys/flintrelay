import { modelFamily } from './policy'
export type Usage = {input_tokens:number; output_tokens:number; cache_read_input_tokens:number; cache_creation_input_tokens:number}
export type Entry = {key:string; recommended:string; requested:string; answered:string|null; usage:unknown; durationMs:number|null; category?:string; timestamp?:number; failed?:boolean; recommendedEffort?:unknown; requestedEffort?:unknown}
export type Tokens = {input:number; output:number; cacheRead:number; cacheWrite:number}
export type Aggregate = {day:number; category:string; requests:number}
const effortLevels=['low','medium','high','xhigh','max']
function effortLabel(value:unknown) { return effortLevels.includes(value as string) ? value as string : 'unknown' }
const categories = ['engineering','mechanical','unknown','explicit-profile','subagent']
function validUsage(value: unknown): value is Usage {
  if(!value || typeof value!=='object') return false
  const v=value as Record<string,unknown>
  return ['input_tokens','output_tokens','cache_read_input_tokens','cache_creation_input_tokens'].every(key=>typeof v[key]==='number' && Number.isSafeInteger(v[key]) && (v[key] as number)>=0)
}
export function pruneAggregates(value: unknown, now: number): Aggregate[] {
  if(!Array.isArray(value)) return []
  return value.filter((v):v is Aggregate=>!!v && typeof v==='object' && Object.keys(v).every(k=>['day','category','requests'].includes(k)) && Number.isSafeInteger(v.day) && v.day>=0 && v.day<=now && now-v.day<30*86400000 && categories.includes(v.category) && Number.isSafeInteger(v.requests) && v.requests>=0).slice(-1000).map(v=>({day:v.day,category:v.category,requests:v.requests}))
}
export class UsageLedger {
  private entries = new Map<string,Entry>()
  private evicted=0
  private dropped=0
  private missingTimestamp=0
  private daily=new Map<string,Aggregate>()
  record(entry: Entry) {
    if(this.entries.has(entry.key)) return
    // Copy only the whitelist, never a request/result object or raw content.
    const u=validUsage(entry.usage) ? {input_tokens:entry.usage.input_tokens,output_tokens:entry.usage.output_tokens,cache_read_input_tokens:entry.usage.cache_read_input_tokens,cache_creation_input_tokens:entry.usage.cache_creation_input_tokens} : null
    this.entries.set(entry.key,{key:entry.key,recommended:entry.recommended,requested:entry.requested,answered:entry.answered,usage:u,durationMs:Number.isFinite(entry.durationMs) && (entry.durationMs as number)>=0 ? entry.durationMs : null,category:categories.includes(entry.category ?? '') ? entry.category : 'unknown',timestamp:entry.timestamp,failed:entry.failed===true,recommendedEffort:effortLabel(entry.recommendedEffort),requestedEffort:effortLabel(entry.requestedEffort)})
    if(Number.isFinite(entry.timestamp) && entry.timestamp!>=0) {
      const day=Math.floor(entry.timestamp!/86400000)*86400000,category=categories.includes(entry.category ?? '') ? entry.category! : 'unknown',key=`${day}/${category}`
      const row=this.daily.get(key) ?? {day,category,requests:0};row.requests++;this.daily.set(key,row)
      const newest=Math.max(...[...this.daily.values()].map(row=>row.day))
      for(const [key,row] of this.daily) if(newest-row.day>=30*86400000) this.daily.delete(key)
      while(this.daily.size>150) this.daily.delete([...this.daily.entries()].sort((a,b)=>a[1].day-b[1].day)[0][0])
    } else this.missingTimestamp++
    while(this.entries.size>1000) {this.entries.delete(this.entries.keys().next().value!); this.evicted++}
  }
  summary() {
    const tokens:Tokens={input:0,output:0,cacheRead:0,cacheWrite:0}
    let unknownUsage=0,mismatches=0,failures=0
    const requestedEffort:Record<string,number>=Object.fromEntries([...effortLevels,'unknown'].map(level=>[level,0]))
    for(const e of this.entries.values()) {
      if(validUsage(e.usage)) {tokens.input+=e.usage.input_tokens; tokens.output+=e.usage.output_tokens; tokens.cacheRead+=e.usage.cache_read_input_tokens; tokens.cacheWrite+=e.usage.cache_creation_input_tokens} else unknownUsage++
      if(e.answered && (modelFamily(e.requested) ? modelFamily(e.requested)!==modelFamily(e.answered) : e.requested!==e.answered)) mismatches++
      if(e.failed) failures++
      requestedEffort[effortLabel(e.requestedEffort)]++
    }
    return {requests:this.entries.size,requestedEffort,answeredEffort:'unobserved',tokens,unknownUsage,mismatches,failures,evicted:this.evicted,droppedObservations:this.dropped,complete:unknownUsage===0 && this.evicted===0 && this.dropped===0,coverage:'observed turn.step requests only',apiCost:'unknown',savings:'unmeasured'}
  }
  aggregates(now: number): Aggregate[] { return pruneAggregates([...this.daily.values()],now) }
  aggregateCoverage() { return {deduplicationWindow:1000,mayRepeatEvictedKeys:this.evicted>0,unknownTimestamp:this.missingTimestamp,droppedObservations:this.dropped,complete:this.missingTimestamp===0 && this.dropped===0 && this.evicted===0} }
  recordDrop() {this.dropped++}
  clear() {this.entries.clear();this.daily.clear();this.evicted=0;this.dropped=0;this.missingTimestamp=0}
}
