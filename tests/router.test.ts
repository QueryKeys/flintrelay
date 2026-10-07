import { test, expect, mock } from 'claude-code/testing'

function setup(on: any, version='2.1.290', model='claude-sonnet-5-5', uiFailure=false, clock=true, nativeModel=true, completion=true) {
  if(clock) mock.clock(on,{now:1700000000000})
  on('session.version',()=>({value:{version}}))
  if(nativeModel) on('session.model',()=>({value:model}))
  on('command.register',()=>({value:{command:'router'}}))
  on('command.list',()=>({value:[]}))
  on('ui.log',()=>{if(uiFailure) throw new Error('display unavailable');return {value:undefined}})
  on('session.start',(_,e)=>({cwd:e.cwd}))
  on('turn.start',(_,e)=>({turnId:e.turnId}))
  if(completion) on('turn.complete',()=>({text:''}))
}
async function start($:any) {
  await $.session.start({cwd:'/work',surface:'terminal',isInteractive:true})
}
async function active($:any) {
  return $.command.run({command:'router',args:'mode active',origin:{kind:'composer'}})
}
async function drain(stream:any) {
  const chunks=[]; let step=await stream.next()
  while(!step.done) {chunks.push(step.value); step=await stream.next()}
  return {chunks,result:step.value}
}
function reply(e:any, usage:any=null) {return {turnId:e.turnId,index:e.index,answer:'ok',toolUses:[],stopReason:'end_turn',usage}}

test('active promotes difficult main work and forwards original stream/result', async ($,on) => {
  setup(on); let sent:any, calls=0
  const chunk={kind:'text',index:0,text:'hello'}
  on('turn.step',async function* (_,e) {sent=e; calls++; yield chunk; return reply(e,{model:'claude-opus-5-5',input_tokens:10,output_tokens:2,cache_read_input_tokens:100,cache_creation_input_tokens:0})})
  await start($); const consent=await active($)
  expect(consent.text.includes('active')).toBe(true)
  await $.turn.start({turnId:'t',text:'Design a new architecture'})
  const outcome=await drain($.turn.step({turnId:'t',index:0,model:'claude-sonnet-5-5',effort:'high',messageCount:3}))
  expect(sent.model).toBe('opus'); expect(sent.effort).toBe('high'); expect(sent.messageCount).toBe(3)
  expect(outcome.chunks[0].text).toBe('hello'); expect(outcome.result.answer).toBe('ok'); expect(calls).toBe(1)
  const report=await $.command.run({command:'router',args:'report'})
  expect(report.text.includes('100')).toBe(true)
})
test('shadow does not change requests despite strong recommendations', async ($,on) => {
  setup(on); let sent:any
  on('turn.step',async function*(_,e){sent=e;return reply(e)})
  await start($); await $.turn.start({turnId:'t',text:'Design a new architecture'})
  await drain($.turn.step({turnId:'t',index:0,model:'claude-sonnet-5-5',messageCount:1}))
  expect(sent.model).toBe('claude-sonnet-5-5')
})
test('unverified host rejects active ownership', async($,on)=>{
  setup(on,'2.1.284'); let sent:any
  on('turn.step',async function*(_,e){sent=e;return reply(e)})
  await start($); const command=await active($); expect(command.text.includes('unsupported')).toBe(true)
  await $.turn.start({turnId:'t',text:'Design a new architecture'})
  await drain($.turn.step({turnId:'t',index:0,model:'claude-sonnet-5-5',messageCount:1}))
  expect(sent.model).toBe('claude-sonnet-5-5')
})
test('tested Desktop 2.1.286 can acquire ownership and promote a difficult task',async($,on)=>{
  setup(on,'2.1.286');let sent:any
  on('turn.step',async function*(_,e){sent=e;return reply(e)})
  await $.session.start({cwd:'/work',surface:'desktop',isInteractive:true})
  expect(JSON.parse((await $.command.run({command:'router',args:'doctor'})).text).ready).toBe(true)
  expect((await active($)).text).toContain('Router active for this session')
  await $.turn.start({turnId:'desktop',text:'Design a new architecture'})
  await drain($.turn.step({turnId:'desktop',index:0,model:'claude-sonnet-5-5',effort:'high',messageCount:1}))
  expect(sent.model).toBe('opus');expect(sent.effort).toBe('high')
})
test('subagent and transient native overrides preserve the incoming model', async($,on)=>{
  setup(on); const sent:string[]=[]
  on('turn.step',async function*(_,e){sent.push(e.model);return reply(e)})
  await start($); await active($); await $.turn.start({turnId:'t',text:'Design a new architecture'})
  await drain($.turn.step({turnId:'t',index:0,model:'claude-sonnet-5-5',messageCount:1,agentId:'child'}))
  await drain($.turn.step({turnId:'t',index:1,model:'claude-haiku-4-5',messageCount:1}))
  expect(sent).toEqual(['claude-sonnet-5-5','claude-haiku-4-5'])
})
test('downstream failure after a chunk does not make a second model request', async($,on)=>{
  setup(on); let calls=0
  on('turn.step',async function*(){calls++;yield {kind:'text',index:0,text:'partial'};throw new Error('provider failed')})
  await start($); await active($); await $.turn.start({turnId:'t',text:'Design a new architecture'})
  const stream=$.turn.step({turnId:'t',index:0,model:'claude-sonnet-5-5',messageCount:1})
  const first=await stream.next();expect(first.value.text).toBe('partial')
  let failed=false;try{await stream.next()}catch{failed=true}
  expect(failed).toBe(true);expect(calls).toBe(1)
})

test('commands without origin cannot activate routing', async($,on)=>{
  setup(on); await start($)
  const answer=await $.command.run({command:'router',args:'mode active'})
  expect(answer.text.includes('trusted user')).toBe(true)
})
test('lock while native lookup is pending prevents a stale override', async($,on)=>{
  let lookupCount=0,release:any,entered:any
  const waiting=new Promise<void>(resolve=>{entered=resolve})
  const delayed=new Promise<string>(resolve=>{release=resolve})
  mock.clock(on,{now:1700000000000})
  on('session.version',()=>({value:{version:'2.1.290'}}))
  on('session.model',async()=>{lookupCount++; if(lookupCount===2){entered();return {value:await delayed}} return {value:'claude-sonnet-5-5'}})
  on('command.list',()=>({value:[]}));on('command.register',()=>({value:{command:'router'}}))
  on('ui.log',()=>({value:undefined}));on('session.start',(_,e)=>({cwd:e.cwd}));on('turn.start',(_,e)=>({turnId:e.turnId}))
  let sent:any;on('turn.step',async function*(_,e){sent=e;return reply(e)})
  await start($);await active($);await $.turn.start({turnId:'t',text:'Design a new architecture'})
  const stream=$.turn.step({turnId:'t',index:0,model:'claude-sonnet-5-5',messageCount:1})
  const pending=drain(stream);await waiting
  await $.command.run({command:'router',args:'lock',origin:{kind:'composer'}})
  release('claude-sonnet-5-5');await pending
  expect(sent.model).toBe('claude-sonnet-5-5')
})
test('skill expansion prevents overriding the rest of the turn',async($,on)=>{
  setup(on);let sent:any
  on('skill.prompt',()=>({text:'example skill'}))
  on('turn.step',async function*(_,e){sent=e;return reply(e)})
  await start($);await active($);await $.turn.start({turnId:'t',text:'Design a new architecture'})
  await $.skill.prompt({skill:'example',args:'',text:'example instructions'})
  await drain($.turn.step({turnId:'t',index:0,model:'claude-sonnet-5-5',messageCount:1}))
  expect(sent.model).toBe('claude-sonnet-5-5')
})
test('native model switch revokes ownership and passes existing hooks through',async($,on)=>{
  setup(on);let existing=0
  on('classic.PostModelSwitch',()=>{existing++;return {}})
  await start($);await active($)
  await $.classic.PostModelSwitch({hook_event_name:'PostModelSwitch',session_id:'session',transcript_path:'/work/transcript.jsonl',cwd:'/work',permission_mode:'default',from_model:'claude-sonnet-5-5',to_model:'claude-opus-5-5',requested_model:'opus',source:'command',context_tokens:100,prompt_cache_warm:false})
  const status=await $.command.run({command:'router',args:'status'})
  expect(status.text.includes('ownership none')).toBe(true);expect(existing).toBe(1)
})
test('display failures do not replace a successful streamed result',async($,on)=>{
  setup(on,'2.1.290','claude-sonnet-5-5',true);on('turn.step',async function*(_,e){return reply(e,{model:'claude-sonnet-5-5',input_tokens:3,output_tokens:2,cache_read_input_tokens:0,cache_creation_input_tokens:0})})
  // The UI API is a stubbed external boundary; failing it must leave the real result intact.
  await start($);await $.turn.start({turnId:'t',text:'unknown task'})
  const result=await drain($.turn.step({turnId:'t',index:0,model:'claude-sonnet-5-5',messageCount:1}))
  expect(result.result.answer).toBe('ok')
})

test('a transient override protects subsequent steps in the same turn',async($,on)=>{
  setup(on);const sent:string[]=[]
  on('turn.step',async function*(_,e){sent.push(e.model);return reply(e)})
  await start($);await active($);await $.turn.start({turnId:'t',text:'Design a new architecture'})
  await drain($.turn.step({turnId:'t',index:0,model:'claude-haiku-4-5',messageCount:1}))
  await drain($.turn.step({turnId:'t',index:1,model:'claude-sonnet-5-5',messageCount:2}))
  expect(sent).toEqual(['claude-haiku-4-5','claude-sonnet-5-5'])
})
test('a native fallback stops repeated router promotions in the same turn',async($,on)=>{
  setup(on);const sent:string[]=[]
  on('turn.step',async function*(_,e){sent.push(e.model);return reply(e,{model:'claude-sonnet-5-5',input_tokens:1,output_tokens:1,cache_read_input_tokens:0,cache_creation_input_tokens:0})})
  await start($);await active($);await $.turn.start({turnId:'t',text:'Design a new architecture'})
  await drain($.turn.step({turnId:'t',index:0,model:'claude-sonnet-5-5',messageCount:1}))
  await drain($.turn.step({turnId:'t',index:1,model:'claude-sonnet-5-5',messageCount:2}))
  expect(sent).toEqual(['opus','claude-sonnet-5-5'])
})


test('existing router command passes through exactly once without registration',async($,on)=>{
  mock.clock(on,{now:1700000000000})
  on('session.version',()=>({value:{version:'2.1.290'}}))
  on('command.list',()=>({value:[{name:'router',source:'user'}]}))
  let registered=0,calls=0
  on('command.register',()=>{registered++;return {value:{command:'router'}}})
  on('ui.log',()=>({value:undefined}));on('session.start',(_,e)=>({cwd:e.cwd}))
  on('command.run',()=>{calls++;return {text:'existing command'}})
  await start($)
  expect((await $.command.run({command:'router',args:'mode active',origin:{kind:'composer'}})).text).toBe('existing command')
  expect(calls).toBe(1);expect(registered).toBe(0)
})
test('skill before turn start protects every affected step including quality profile',async($,on)=>{
  setup(on);const sent:string[]=[]
  on('skill.prompt',()=>({text:'example'}))
  on('turn.step',async function*(_,e){sent.push(e.model);return reply(e)})
  await start($);await active($)
  await $.command.run({command:'router',args:'profile quality',origin:{kind:'composer'}})
  await $.skill.prompt({skill:'example',args:'',text:'example instructions'})
  await $.turn.start({turnId:'t',text:'Design a new architecture'})
  for(let i=0;i<2;i++) await drain($.turn.step({turnId:'t',index:i,model:'claude-sonnet-5-5',messageCount:i+1}))
  expect(sent).toEqual(['claude-sonnet-5-5','claude-sonnet-5-5'])
})
test('optional finishing clock failure preserves known request usage',async($,on)=>{
  setup(on,'2.1.290','claude-sonnet-5-5',false,false)
  let reads=0;on('clock.now',()=>{reads++;if(reads>=2)throw new Error('clock unavailable');return {value:1700000000000}})
  on('turn.step',async function*(_,e){return reply(e,{model:'claude-sonnet-5-5',input_tokens:10,output_tokens:1,cache_read_input_tokens:0,cache_creation_input_tokens:0})})
  await start($);await $.turn.start({turnId:'t',text:'unknown'})
  expect((await drain($.turn.step({turnId:'t',index:0,model:'claude-sonnet-5-5',messageCount:1}))).result.answer).toBe('ok')
  const report=JSON.parse((await $.command.run({command:'router',args:'report'})).text)
  expect(report.requests).toBe(1);expect(report.tokens.input).toBe(10);expect(report.tokens.output).toBe(1)
})
test('explicit off survives clear and resume with no ongoing collection',async($,on)=>{
  setup(on,'2.1.290','claude-sonnet-5-5',false,false)
  let clocks=0;on('clock.now',()=>{clocks++;return {value:1700000000000}})
  on('classic.SessionStart',()=>({}));on('turn.step',async function*(_,e){return reply(e)})
  await start($);await $.command.run({command:'router',args:'mode off',origin:{kind:'composer'}})
  for(const source of ['clear','resume']) {
    await $.classic.SessionStart({hook_event_name:'SessionStart',session_id:'s',transcript_path:'/work/t',cwd:'/work',permission_mode:'default',source,model:'sonnet'})
    expect((await $.command.run({command:'router',args:'status'})).text).toContain('Router off')
    const before=clocks;await $.turn.start({turnId:source,text:'architecture'})
    await drain($.turn.step({turnId:source,index:0,model:'claude-sonnet-5-5',messageCount:1}))
    expect(clocks).toBe(before)
    expect(JSON.parse((await $.command.run({command:'router',args:'report'})).text).requests).toBe(0)
  }
})
for(const removal of ['completion','eviction']) test('pending lookup abstains after turn '+removal,async($,on)=>{
  setup(on,'2.1.290','claude-sonnet-5-5',false,true,false,false);let lookups=0,release:any,entered:any,sent:any
  const waiting=new Promise<void>(resolve=>{entered=resolve})
  const delayed=new Promise<string>(resolve=>{release=resolve})
  on('session.model',async()=>{lookups++;if(lookups===2){entered();return {value:await delayed}}return {value:'claude-sonnet-5-5'}})
  on('turn.step',async function*(_,e){sent=e;return reply(e)})
  on('turn.complete',()=>({text:''}))
  await start($);await active($);await $.turn.start({turnId:'old',text:'architecture'})
  const pending=drain($.turn.step({turnId:'old',index:0,model:'claude-sonnet-5-5',messageCount:1}));await waiting
  if(removal==='completion') await $.turn.complete({turnId:'old',answer:'ok',durationMs:1,isAborted:false,usage:null})
  else for(let i=0;i<64;i++) await $.turn.start({turnId:String(i),text:'architecture'})
  release('claude-sonnet-5-5');await pending
  expect(sent.model).toBe('claude-sonnet-5-5')
})
