import {test,expect} from 'claude-code/testing'
test('configured off stays off across lifecycle and initialization failure',async($,on)=>{
  let clocks=0
  on('clock.now',()=>{clocks++;return {value:1700000000000}})
  on('session.version',()=>{throw new Error('host unavailable')})
  on('session.start',(_,e)=>({cwd:e.cwd}));on('classic.SessionStart',()=>({}));on('turn.start',(_,e)=>({turnId:e.turnId}))
  let sent:any;on('turn.step',async function*(_,e){sent=e;return {turnId:e.turnId,index:e.index,answer:'ok',toolUses:[],stopReason:'end_turn',usage:null}})
  await $.session.start({cwd:'/work',surface:'terminal',isInteractive:true})
  for(const source of ['clear','resume']) {
    await $.classic.SessionStart({hook_event_name:'SessionStart',session_id:'s',transcript_path:'/work/t',cwd:'/work',permission_mode:'default',source,model:'sonnet'})
    await $.turn.start({turnId:source,text:'architecture'})
    const stream=$.turn.step({turnId:source,index:0,model:'sonnet',messageCount:1});let step=await stream.next();while(!step.done)step=await stream.next()
  }
  expect(sent.model).toBe('sonnet');expect(clocks).toBe(0)
})
