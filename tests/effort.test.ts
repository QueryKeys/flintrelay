import { test, expect, mock } from 'claude-code/testing'

function setup(on:any,model='claude-sonnet-5-5',version='2.1.290',nativeModel=true) {
  mock.clock(on,{now:1700000000000})
  on('session.version',()=>({value:{version}}));if(nativeModel)on('session.model',()=>({value:model}))
  on('command.list',()=>({value:[]}));on('command.register',()=>({value:{command:'router'}}))
  on('ui.log',()=>({value:undefined}));on('session.start',(_,e)=>({cwd:e.cwd}))
  on('turn.start',(_,e)=>({turnId:e.turnId}));on('command.run',()=>({text:'native command'}))
  on('skill.prompt',()=>({text:'skill'}))
}
async function command($:any,args:string,kind='composer') {return $.command.run({command:'router',args,origin:{kind}})}
async function start($:any,active=true) {
  await $.session.start({cwd:'/work',surface:'terminal',isInteractive:true})
  if(active) await command($,'mode active')
}
async function request($:any,text:string,model:string,effort:any='xhigh',agentId?:string) {
  await $.turn.start({turnId:'t',text})
  const stream=$.turn.step({turnId:'t',index:0,model,effort,messageCount:2,...agentId && {agentId}})
  let item=await stream.next();while(!item.done)item=await stream.next()
  return item.value
}
function capture(on:any,observe:(e:any)=>void) {
  on('turn.step',async function*(_,e){observe(e);return {turnId:e.turnId,index:e.index,answer:'ok',toolUses:[],stopReason:'end_turn',usage:null}})
}
for(const [text,effort] of [
  ['Format this JSON exactly','low'],['הוסף פונקציה שמחשבת סכום','medium'],
  ['Fix this bug','high'],['תכנן ארכיטקטורה למערכת חדשה','high'],
  ['Perform a deep security architecture analysis','xhigh'],['עשה את זה','xhigh']
]) test('automatic effort on an Opus baseline: '+effort+' for '+text,async($,on)=>{
  setup(on,'claude-opus-5-5');let sent:any;capture(on,e=>{sent=e})
  await start($);await request($,text,'claude-opus-5-5')
  expect(sent.effort).toBe(effort);expect(sent.model).toBe('claude-opus-5-5')
})
test('automatic effort raises low and enables model promotion from xhigh',async($,on)=>{
  setup(on);let sent:any;capture(on,e=>{sent=e});await start($)
  await request($,'Design a new architecture','claude-sonnet-5-5','xhigh')
  expect(sent.model).toBe('opus');expect(sent.effort).toBe('high')
  await $.turn.start({turnId:'next',text:'Fix this bug'})
  const stream=$.turn.step({turnId:'next',index:0,model:'claude-sonnet-5-5',effort:'low',messageCount:2});await stream.next()
  expect(sent.effort).toBe('high')
})
test('effort preserve and auto are trusted session controls',async($,on)=>{
  setup(on);let sent:any;capture(on,e=>{sent=e});await start($)
  expect((await command($,'effort preserve')).text).toContain('preserve')
  await request($,'Format this JSON exactly','claude-sonnet-5-5');expect(sent.effort).toBe('xhigh')
  expect((await command($,'effort auto','plugin')).text).toContain('trusted user')
  expect((await command($,'effort auto')).text).toContain('auto')
  await $.turn.start({turnId:'next',text:'Format this JSON exactly'})
  await $.turn.step({turnId:'next',index:0,model:'claude-sonnet-5-5',effort:'xhigh',messageCount:2}).next()
  expect(sent.effort).toBe('low')
})
test('native effort command preserves user choice and passes through once',async($,on)=>{
  setup(on);let sent:any;capture(on,e=>{sent=e});await start($)
  expect((await $.command.run({command:'effort',args:'high',origin:{kind:'composer'}})).text).toBe('native command')
  await request($,'Format this JSON exactly','claude-sonnet-5-5','high');expect(sent.effort).toBe('high')
  expect((await command($,'status')).text).toContain('effort preserve')
})
for(const protection of ['shadow','off','lock','skill','subagent','unknown-host']) test('effort is unchanged under '+protection,async($,on)=>{
  setup(on,'claude-sonnet-5-5',protection==='unknown-host'?'2.1.284':'2.1.290');let sent:any;capture(on,e=>{sent=e})
  await start($,protection!=='shadow')
  if(protection==='off')await command($,'mode off')
  if(protection==='lock')await command($,'lock')
  if(protection==='skill')await $.skill.prompt({skill:'example',args:'',text:'instructions'})
  await request($,'Format this JSON exactly','claude-sonnet-5-5','xhigh',protection==='subagent'?'child':undefined)
  expect(sent.effort).toBe('xhigh')
})
for(const [model,incoming,expected] of [
  ['claude-opus-4-6','medium','high'],['claude-opus-4-7','low','xhigh'],
  ['opus','medium','high'],['claude-haiku-4-5',undefined,'high'],
  ['claude-opus-5-9','medium','medium'],['claude-sonnet-5-5[1m]','medium','medium'],
  ['claude-opus-5-5',4096,4096]
]) test('effort respects model compatibility: '+model+' / '+incoming,async($,on)=>{
  setup(on,model);let sent:any;capture(on,e=>{sent=e});await start($)
  await $.turn.start({turnId:'t',text:'Perform a deep security architecture analysis'})
  await $.turn.step({turnId:'t',index:0,model,effort:incoming,messageCount:2}).next()
  expect(sent.effort).toBe(expected)
})
test('doctor and report expose policy and requested effort without claiming execution',async($,on)=>{
  setup(on);capture(on,()=>{});await start($)
  await request($,'Format this JSON exactly','claude-sonnet-5-5')
  const doctor=JSON.parse((await command($,'doctor')).text)
  expect(doctor.effort).toBe('auto');expect(doctor.automaticEffortDowngrade).toBe(true)
  const report=JSON.parse((await command($,'report')).text)
  expect(report.requestedEffort.low).toBe(1);expect(report.answeredEffort).toBe('unobserved')
})

test('an unchanged legacy model receives no new effort parameter',async($,on)=>{
  setup(on,'claude-haiku-4-5');let sent:any;capture(on,e=>{sent=e});await start($)
  await $.turn.start({turnId:'t',text:'Format this JSON exactly'})
  await $.turn.step({turnId:'t',index:0,model:'claude-haiku-4-5',messageCount:2}).next()
  expect(sent.model).toBe('claude-haiku-4-5');expect(sent.effort).toBe(undefined)
})
test('manual effort during a pending lookup cancels a stale adaptation',async($,on)=>{
  setup(on,'claude-sonnet-5-5','2.1.290',false);let calls=0,entered:any,release:any,sent:any
  const waiting=new Promise<void>(r=>{entered=r}),delayed=new Promise<string>(r=>{release=r})
  on('session.model',async()=>{if(++calls===2){entered();return {value:await delayed}}return {value:'claude-sonnet-5-5'}})
  capture(on,e=>{sent=e});await start($);await $.turn.start({turnId:'t',text:'Format this JSON exactly'})
  const pending=$.turn.step({turnId:'t',index:0,model:'claude-sonnet-5-5',effort:'xhigh',messageCount:2}).next()
  await waiting;await $.command.run({command:'effort',args:'high',origin:{kind:'composer'}})
  release('claude-sonnet-5-5');await pending
  expect(sent.effort).toBe('xhigh')
})
test('mixed mechanical and debugging work gets a high effort floor',async($,on)=>{
  setup(on);let sent:any;capture(on,e=>{sent=e});await start($)
  await request($,'Format this JSON then fix this bug','claude-sonnet-5-5')
  expect(sent.effort).toBe('high')
})
test('explicit escalation raises the effort floor before the next turn',async($,on)=>{
  setup(on);let sent:any;capture(on,e=>{sent=e});await start($)
  await command($,'escalate');await request($,'Format this JSON exactly','claude-sonnet-5-5','low')
  expect(sent.model).toBe('opus');expect(sent.effort).toBe('high')
})

test('preserve keeps advanced effort and refuses incompatible alias promotion',async($,on)=>{
  setup(on);let sent:any;capture(on,e=>{sent=e});await start($);await command($,'effort preserve')
  await request($,'Design a new architecture','claude-sonnet-5-5')
  expect(sent.model).toBe('claude-sonnet-5-5');expect(sent.effort).toBe('xhigh')
})
test('quality model floor does not inflate effort for a bounded task',async($,on)=>{
  setup(on);let sent:any;capture(on,e=>{sent=e});await start($);await command($,'profile quality')
  await request($,'Format this JSON exactly','claude-sonnet-5-5')
  expect(sent.model).toBe('opus');expect(sent.effort).toBe('low')
})
