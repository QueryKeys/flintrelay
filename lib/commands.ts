import { modelFamily } from './policy'
import type { RouterState } from './state'
export function handleCommand(state: RouterState, args: string, origin: string, nativeModel: string | null, ready: boolean): {text:string} {
  const parts=args.trim().split(/\s+/),action=parts[0] || 'status',value=parts[1]
  if(action==='status') return {text:`Router ${state.mode}; profile ${state.profile}; ownership ${state.owned ? 'active' : 'none'}; lock ${state.locked ? 'on':'off'}. Preview upgrades only; savings unmeasured.`}
  if(!['composer','bridge'].includes(origin)) return {text:'Routing changes require a trusted user command (terminal or Remote Control).'}
  if(action==='mode' && ['off','shadow','active'].includes(value) && parts.length===2) {
    if(value==='active') {
      if(!ready) return {text:'Active routing unsupported: exact host contract or configuration not verified.'}
      if(!nativeModel || !modelFamily(nativeModel)) return {text:'Active routing unavailable for an unknown or extended-context model.'}
      state.enable(nativeModel); return {text:'Router active for this session; upgrade-only policy. Account entitlement remains native.'}
    }
    state.disable(value as 'off'|'shadow'); return {text:`Router ${value}; ownership revoked.`}
  }
  if(action==='profile' && ['balanced','quality'].includes(value) && parts.length===2) {state.setProfile(value as 'balanced'|'quality');return {text:`Router profile ${value}; applies to new turns.`}}
  if(action==='lock' && parts.length===1) {state.lock();return {text:'Router locked; native model selection preserved.'}}
  if(action==='unlock' && parts.length===1) {state.unlock();return {text:'Router unlocked in shadow. Run mode active to grant session ownership again.'}}
  if(action==='escalate' && parts.length===1) return {text:state.escalate(state.currentTurn) ? 'Opus floor requested for the current or next turn; native restrictions still apply.' : 'Escalation limit reached.'}
  if(action==='reset' && parts.length===1) {state.reset();return {text:'Router reset; ownership revoked and local metrics cleared.'}}
  return {text:'Usage: /router status | doctor | mode off|shadow|active | profile balanced|quality | lock | unlock | escalate | report | reset'}
}
