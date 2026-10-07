import { test, expect, mock } from 'claude-code/testing'
test('opted-in persistence writes only bounded category counts and reset deletes them', async($,on)=>{
  const now=1700000000000,day=Math.floor(now/86400000)*86400000
  const saved=new Map<string,unknown>([['router/v1/0/expired',[{day:0,category:'unknown',requests:9}]],['router/v1/'+day+'/other-session',[{day,category:'engineering',requests:4}]]])
  mock.clock(on,{now})
  on('session.version',()=>({value:{version:'2.1.290'}}));on('session.model',()=>({value:'claude-sonnet-5-5'}))
  on('command.list',()=>({value:[]}));on('command.register',()=>({value:{command:'router'}}))
  on('ui.log',()=>({value:undefined}));on('session.start',(_,e)=>({cwd:e.cwd}));on('turn.start',(_,e)=>({turnId:e.turnId}));on('turn.complete',()=>({text:''}))
  on('store.keys',()=>({value:[...saved.keys()]}));on('store.set',(_,e)=>{saved.set(e.key,e.value);return {value:undefined}});on('store.delete',(_,e)=>{saved.delete(e.key);return {value:undefined}})
  on('turn.step',async function*(_,e){return {turnId:e.turnId,index:e.index,answer:'PRIVATE_ANSWER',toolUses:[],stopReason:'end_turn',usage:{model:'claude-sonnet-5-5',input_tokens:10,output_tokens:1,cache_read_input_tokens:0,cache_creation_input_tokens:0}}})
  await $.session.start({cwd:'/work',surface:'terminal',isInteractive:true})
  await $.turn.start({turnId:'PRIVATE_TURN',text:'Design a new architecture PRIVATE_PROMPT'})
  const stream=$.turn.step({turnId:'PRIVATE_TURN',index:0,model:'claude-sonnet-5-5',messageCount:1})
  let step=await stream.next();while(!step.done)step=await stream.next()
  await $.turn.complete({turnId:'PRIVATE_TURN',answer:'PRIVATE_ANSWER',durationMs:2,isAborted:false,usage:null})
  expect(saved.has('router/v1/0/expired')).toBe(false)
  const own=[...saved.entries()].filter(([key])=>!key.endsWith('/other-session'))
  expect(own.length).toBe(1)
  expect((own[0][1] as any).counts).toEqual([{day,category:'engineering',requests:1}])
  expect((own[0][1] as any).schemaVersion).toBe(2)
  expect(JSON.stringify([...saved])).not.toContain('PRIVATE_')
  expect(saved.get('router/v1/'+day+'/other-session')).toEqual([{day,category:'engineering',requests:4}])
  await $.command.run({command:'router',args:'reset',origin:{kind:'composer'}})
  expect(saved.size).toBe(0)
})
test('store failure leaves completed turn and user hooks intact',async($,on)=>{
  mock.clock(on,{now:1700000000000})
  on('session.version',()=>({value:{version:'2.1.290'}}));on('command.list',()=>({value:[]}));on('command.register',()=>({value:{command:'router'}}));on('ui.log',()=>({value:undefined}))
  on('session.start',(_,e)=>({cwd:e.cwd}));on('turn.start',(_,e)=>({turnId:e.turnId}))
  let completed=0;on('turn.complete',()=>{completed++;return {text:'original'}})
  on('store.keys',()=>({value:[]}));on('store.set',()=>{throw new Error('disk unavailable')})
  on('turn.step',async function*(_,e){return {turnId:e.turnId,index:e.index,answer:'ok',toolUses:[],stopReason:'end_turn',usage:null}})
  await $.session.start({cwd:'/work',surface:'terminal',isInteractive:true});await $.turn.start({turnId:'t',text:'unknown'})
  const stream=$.turn.step({turnId:'t',index:0,model:'claude-sonnet-5-5',messageCount:1});let step=await stream.next();while(!step.done)step=await stream.next()
  const result=await $.turn.complete({turnId:'t',answer:'ok',durationMs:1,isAborted:false,usage:null})
  expect(completed).toBe(1);expect(result.text).toBe('original')
  const doctor=await $.command.run({command:'router',args:'doctor'});expect(doctor.text).toContain('failed')
})

for(const multiDay of [false,true]) test('reset drains an older '+(multiDay?'multi-day':'single-day')+' write before deletion',async($,on)=>{
  let now=1700000000000,writes=0,entered:any,release:any
  const waiting=new Promise<void>(resolve=>{entered=resolve})
  const delayed=new Promise<void>(resolve=>{release=resolve})
  const saved=new Map<string,any>()
  on('clock.now',()=>({value:now}));on('session.version',()=>({value:{version:'2.1.290'}}))
  on('command.list',()=>({value:[]}));on('command.register',()=>({value:{command:'router'}}));on('ui.log',()=>({value:undefined}))
  on('session.start',(_,e)=>({cwd:e.cwd}));on('turn.start',(_,e)=>({turnId:e.turnId}));on('turn.complete',()=>({text:''}))
  on('store.keys',()=>({value:[...saved.keys()]}));on('store.delete',(_,e)=>{saved.delete(e.key);return {value:undefined}})
  on('store.set',async(_,e)=>{writes++;if(writes===1){entered();await delayed}saved.set(e.key,e.value);return {value:undefined}})
  on('turn.step',async function*(_,e){return {turnId:e.turnId,index:e.index,answer:'ok',toolUses:[],stopReason:'end_turn',usage:null}})
  await $.session.start({cwd:'/work',surface:'terminal',isInteractive:true})
  for(let i=0;i<(multiDay?2:1);i++) {
    await $.turn.start({turnId:String(i),text:'architecture'})
    const stream=$.turn.step({turnId:String(i),index:0,model:'sonnet',messageCount:1});let step=await stream.next();while(!step.done)step=await stream.next()
    if(multiDay) now+=86400000
  }
  const complete=$.turn.complete({turnId:'0',answer:'ok',durationMs:1,isAborted:false,usage:null});await waiting
  let resetFinished=false
  const reset=$.command.run({command:'router',args:'reset',origin:{kind:'composer'}}).then(result=>{resetFinished=true;return result})
  // Let reset reach its asynchronous storage boundary before releasing the old writer.
  for(let i=0;i<12;i++) await Promise.resolve()
  expect(resetFinished).toBe(false)
  release();await complete;await reset
  expect(saved.size).toBe(0)
})
test('failed deletion reports partial reset in the reset acknowledgement',async($,on)=>{
  mock.clock(on,{now:1700000000000})
  on('session.version',()=>({value:{version:'2.1.290'}}));on('command.list',()=>({value:[]}));on('command.register',()=>({value:{command:'router'}}));on('ui.log',()=>({value:undefined}));on('session.start',(_,e)=>({cwd:e.cwd}))
  on('store.keys',()=>({value:['router/v1/1700000000000/old']}));on('store.delete',()=>{throw new Error('disk unavailable')})
  await $.session.start({cwd:'/work',surface:'terminal',isInteractive:true})
  const result=await $.command.run({command:'router',args:'reset',origin:{kind:'composer'}})
  expect(result.text.toLowerCase()).toContain('persisted deletion failed')
  expect((await $.command.run({command:'router',args:'status'})).text).toContain('ownership none')
})
test('failed streams are included in persisted request counts',async($,on)=>{
  mock.clock(on,{now:1700000000000});let saved:any
  on('session.version',()=>({value:{version:'2.1.290'}}));on('command.list',()=>({value:[]}));on('command.register',()=>({value:{command:'router'}}));on('ui.log',()=>({value:undefined}))
  on('session.start',(_,e)=>({cwd:e.cwd}));on('turn.start',(_,e)=>({turnId:e.turnId}));on('turn.complete',()=>({text:''}))
  on('store.keys',()=>({value:[]}));on('store.set',(_,e)=>{saved=e.value;return {value:undefined}})
  on('turn.step',async function*(){throw new Error('provider failed')})
  await $.session.start({cwd:'/work',surface:'terminal',isInteractive:true});await $.turn.start({turnId:'t',text:'architecture'})
  try {await $.turn.step({turnId:'t',index:0,model:'sonnet',messageCount:1}).next()}catch{}
  await $.turn.complete({turnId:'t',answer:'',durationMs:1,isAborted:true,usage:null})
  const rows=Array.isArray(saved)?saved:saved?.counts
  expect(rows?.[0]?.requests).toBe(1)
})
