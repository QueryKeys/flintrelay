import { test, expect, mock } from 'claude-code/testing'

test('configured preserve retains effort and only an explicit command resumes adaptation',async($,on)=>{
  mock.clock(on,{now:1700000000000})
  on('session.version',()=>({value:{version:'2.1.290'}}))
  on('session.model',()=>({value:'claude-sonnet-5-5'}))
  on('command.list',()=>({value:[]}));on('command.register',()=>({value:{command:'router'}}))
  on('session.start',(_,e)=>({cwd:e.cwd}));on('turn.start',(_,e)=>({turnId:e.turnId}))
  on('ui.log',()=>({value:undefined}));let sent:any
  on('turn.step',async function*(_,e){sent=e;return {turnId:e.turnId,index:e.index,answer:'ok',toolUses:[],stopReason:'end_turn',usage:null}})
  await $.session.start({cwd:'/work',surface:'terminal',isInteractive:true})
  expect((await $.command.run({command:'router',args:'status'})).text).toContain('effort preserve')
  await $.command.run({command:'router',args:'mode active',origin:{kind:'composer'}})
  await $.turn.start({turnId:'one',text:'Format this JSON exactly'})
  await $.turn.step({turnId:'one',index:0,model:'claude-sonnet-5-5',effort:'xhigh',messageCount:1}).next()
  expect(sent.effort).toBe('xhigh')
  await $.command.run({command:'router',args:'effort auto',origin:{kind:'composer'}})
  await $.turn.start({turnId:'two',text:'Format this JSON exactly'})
  await $.turn.step({turnId:'two',index:0,model:'claude-sonnet-5-5',effort:'xhigh',messageCount:1}).next()
  expect(sent.effort).toBe('low')
})
