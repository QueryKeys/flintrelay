import { selectEffort } from '../lib/effort'
import type { Register } from 'claude-code'
import { classify, modelFamily, parseOptions, promote, TESTED_HOSTS } from '../lib/policy'
import { RouterState } from '../lib/state'
import { UsageLedger } from '../lib/ledger'
import { handleCommand } from '../lib/commands'

export const register: Register = (on, options) => {
  const config=parseOptions(options)
  const state=new RouterState(), ledger=new UsageLedger()
  state.mode=config.mode; state.profile=config.profile; state.effortPolicy=config.effortPolicy
  let host='unknown', ready=false, initialized=false, ownsCommand=false
  let persistenceFailed=false
  let persistenceTail:Promise<void>=Promise.resolve()
  function enqueuePersistence(task:()=>Promise<void>) {
    const queued=persistenceTail.then(task)
    persistenceTail=queued.catch(()=>undefined)
    return queued
  }
  function collecting(epoch:string) {return state.mode!=='off' && epoch===state.epoch}
  function record(entry:Parameters<UsageLedger['record']>[0]) {
    try {ledger.record(entry)} catch {ledger.recordDrop()}
  }

  on('session.start', async ($,e,next) => {
    try {
      host=(await $.session.version()).version
      state.epoch=crypto.randomUUID()
      const commands=await $.command.list()
      if(commands.some(command=>command.name==='router')) {
        ready=false; state.disable(state.mode==='off' ? 'off' : 'shadow')
        $.ui.log('FlintRelay: /router already exists; routing remains disabled.')
      } else {
        await $.command.register({name:'router',description:'Control native model and effort routing and inspect observed usage.',argumentHint:'status|doctor|mode|profile|effort|lock|unlock|escalate|report|reset',immediate:true})
        ownsCommand=true
        ready=config.valid && TESTED_HOSTS.includes(host as (typeof TESTED_HOSTS)[number])
      }
      initialized=true
      if(!ready) $.ui.log('FlintRelay: active routing unavailable; use /router doctor.')
    } catch {
      ready=false; state.disable(state.mode==='off' ? 'off' : 'shadow')
    }
    return next(e)
  })

  on('command.run', {command:'router'}, async ($,e,next) => {
    if(!ownsCommand) return next(e)
    const args=e.args.trim(), origin=e.origin?.kind ?? 'unclassified'
    if(args==='report') return {text:JSON.stringify(ledger.summary(),null,2)}
    if(args==='doctor') return {text:JSON.stringify({host,testedHosts:TESTED_HOSTS,ready:initialized && ready,configurationValid:config.valid,mode:state.mode,ownership:state.owned,effort:state.effortPolicy,automaticEffortDowngrade:state.effortPolicy==='auto',effortExecution:'native caps apply; answered effort unobserved',automaticDowngrade:false,persistence:config.persist ? (persistenceFailed?'failed':'opted-in aggregate request counts'):'off',coverage:'observed turn.step only',quality:'unmeasured',savings:'unmeasured'},null,2)}
    let nativeModel:string|null=null
    const revision=state.revision
    if(args==='mode active' && ['composer','bridge'].includes(origin)) {
      try {nativeModel=await $.session.model()} catch {return {text:'Native model lookup failed; ownership not acquired.'}}
      if(revision!==state.revision) return {text:'Routing state changed during activation; ownership not acquired.'}
    }
    const result=handleCommand(state,args,origin,nativeModel,initialized && ready)
    if(args==='reset' && ['composer','bridge'].includes(origin)) {
      ledger.clear(); state.epoch=crypto.randomUUID()
      if(config.persist) {
        try {
          await enqueuePersistence(async()=>{for(const key of await $.store.keys()) if(key.startsWith('router/v1/') || key.startsWith('router/v2/')) await $.store.delete(key)})
          persistenceFailed=false
        } catch {persistenceFailed=true;return {text:result.text+' Persisted deletion failed; some saved metrics may remain. Retry reset.'}}
      }
    }
    return result
  })

  on('turn.start', async ($,e,next) => {
    if(state.mode!=='off') state.startTurn(e.turnId,classify(e.text,state.profile))
    return next(e)
  })

  on('turn.step', async function* ($,e,next) {
    let outgoing=e,started:number|null=null
    const recommendation=state.decision(e.turnId)
    const epoch=state.epoch,revision=state.revision
    try {
      if(state.mode!=='off') {try {started=await $.clock.now()} catch { /* Timing is optional. */ }}
      if(!e.agentId && ready && initialized && state.mode==='active' && state.owned && !state.locked && recommendation && state.turn(e.turnId) && !state.turn(e.turnId)!.blocked) {
        const nativeModel=await $.session.model()
        if(revision===state.revision && nativeModel!==state.baseline) state.lock()
        if(revision===state.revision && e.model!==nativeModel) state.markSkill(e.turnId)
        if(revision===state.revision && state.owned && !state.locked && state.mode==='active' && state.turn(e.turnId) && !state.turn(e.turnId)!.blocked && nativeModel===state.baseline && e.model===nativeModel) {
          const decision=state.decision(e.turnId)!
          const automatic=state.effortPolicy==='auto' && typeof e.effort!=='number'
          const candidate=promote(e.model,decision.tier,automatic ? undefined : e.effort,config.allowed)
          const effort=automatic ? selectEffort(candidate ?? e.model,decision.effort ?? 'keep',e.effort,!!candidate) : null
          // An advanced incoming level may accompany a promotion only when we
          // can replace it with a compatible automatic recommendation.
          const target=candidate && (effort!==null || promote(e.model,decision.tier,e.effort,config.allowed))
          if(target) outgoing={...e,model:candidate!}
          if(effort!==null) outgoing={...outgoing,effort}
        }
      }
    } catch {
      // Only policy preparation is recoverable. Never retry downstream dispatch.
      outgoing=e
    }
    let completed=false
    try {
      const result=yield* next(outgoing)
      completed=true
      if(outgoing.model!==e.model && result.usage?.model && modelFamily(result.usage.model)!==modelFamily(outgoing.model)) state.markSkill(e.turnId)
      if(state.mode!=='off' && epoch===state.epoch) {
        let finished:number|null=null
        try {finished=await $.clock.now()} catch { /* Keep known usage without fabricated timing. */ }
        if(collecting(epoch)) {
          record({key:`${epoch}/${e.turnId}/${e.agentId ?? 'main'}/${e.index}`,recommended:recommendation?.tier ?? 'keep',requested:outgoing.model,answered:result.usage?.model ?? null,recommendedEffort:recommendation?.effort,requestedEffort:outgoing.effort,usage:result.usage,durationMs:started===null || finished===null ? null : finished-started,category:e.agentId ? 'subagent' : recommendation?.category,timestamp:finished ?? started ?? undefined})
          try {if(e.index===0 && !e.agentId) $.ui.log(`FlintRelay: ${state.mode}; recommended ${recommendation?.tier ?? 'keep'}; requested ${outgoing.model}; effort recommended ${recommendation?.effort ?? 'keep'}, requested ${outgoing.effort ?? 'native-default'} (native caps apply); answered ${result.usage?.model ?? 'unknown'}; reason ${recommendation?.reason ?? 'untracked-turn'}.`)} catch { /* Display cannot replace the response. */ }
        }
      }
      return result
    } finally {
      if(!completed && state.mode!=='off' && epoch===state.epoch) {
        let finished:number|null=null
        try {finished=await $.clock.now()} catch { /* Preserve the failed observation. */ }
        if(collecting(epoch)) record({key:`${epoch}/${e.turnId}/${e.agentId ?? 'main'}/${e.index}`,recommended:recommendation?.tier ?? 'keep',requested:outgoing.model,answered:null,recommendedEffort:recommendation?.effort,requestedEffort:outgoing.effort,usage:null,durationMs:null,category:e.agentId ? 'subagent' : recommendation?.category,timestamp:finished ?? started ?? undefined,failed:true})
      }
    }
  })

  on('turn.complete', async ($,e,next) => {
    if(!e.agentId) state.complete(e.turnId)
    if(config.persist && state.mode!=='off') {
      const epoch=state.epoch
      try {
        const now=await $.clock.now(),prefix='router/v2/'
        if(collecting(epoch)) {
          const aggregates=ledger.aggregates(now),coverage=ledger.aggregateCoverage()
          await enqueuePersistence(async()=>{
            for(const day of new Set(aggregates.map(row=>row.day))) {
              if(!collecting(epoch)) return
              await $.store.set(`${prefix}${day}/${epoch}`,{schemaVersion:2,coverage,counts:aggregates.filter(row=>row.day===day)})
            }
            if(!collecting(epoch)) return
            const keys=(await $.store.keys()).filter(key=>key.startsWith(prefix) || key.startsWith('router/v1/')).sort()
            const retained:string[]=[]
            for(const key of keys) {
              const stamp=Number(key.split('/')[2])
              if(!Number.isFinite(stamp) || stamp>now || now-stamp>=30*86400000) await $.store.delete(key)
              else retained.push(key)
            }
            for(const key of retained.slice(0,Math.max(0,retained.length-200))) await $.store.delete(key)
          })
        }
      } catch {persistenceFailed=true}
    }
    return next(e)
  })

  on('command.run', {command:'effort'}, async ($,e,next) => {
    if(['composer','bridge'].includes(e.origin?.kind ?? '')) state.setEffortPolicy('preserve')
    return next(e)
  })
  on('skill.prompt', async ($,e,next) => {state.markSkill();return next(e)})
  on('classic.PostModelSwitch', async ($,e,next) => {state.lock();return next(e)})
  on('classic.SessionStart', async ($,e,next) => {
    if(e.source==='clear' || e.source==='resume') {state.reset(crypto.randomUUID());ledger.clear()}
    return next(e)
  })
  on('session.end', async ($,e,next) => {state.reset(crypto.randomUUID());ledger.clear();return next(e)})
}
