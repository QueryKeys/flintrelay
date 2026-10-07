import type { Mode, Profile, Recommendation } from './policy'
export type Turn = {recommendation: Recommendation; blocked: boolean; escalations: number}
export class RouterState {
  mode: Mode = 'shadow'
  profile: Profile = 'balanced'
  owned = false
  baseline: string | null = null
  locked = false
  revision = 0
  epoch = 'uninitialized'
  turns = new Map<string,Turn>()
  pendingEscalation = false
  pendingSkill = false
  currentTurn: string | undefined
  enable(model: string) { this.mode='active'; this.owned=true; this.baseline=model; this.locked=false; this.revision++ }
  disable(mode: 'off'|'shadow' = 'shadow') { this.mode=mode; this.owned=false; this.baseline=null; this.revision++ }
  lock() { this.locked=true; this.disable(this.mode==='off' ? 'off' : 'shadow') }
  unlock() { this.locked=false; this.disable('shadow') }
  setProfile(profile: Profile) { this.profile=profile; this.revision++ }
  reset(epoch?: string) { this.disable(this.mode==='off' ? 'off' : 'shadow'); this.locked=false; this.turns.clear(); this.currentTurn=undefined; this.pendingEscalation=false; this.pendingSkill=false; this.epoch=epoch ?? `${this.epoch}/reset`; }
  startTurn(id: string, recommendation: Recommendation) {
    if (this.turns.has(id)) return
    const pending = this.pendingEscalation; this.pendingEscalation=false
    const blocked=this.pendingSkill; this.pendingSkill=false
    this.turns.set(id,{recommendation:pending ? {tier:'opus',reason:'explicit-escalation',category:'explicit-profile'} : recommendation,blocked,escalations:pending ? 1 : 0})
    this.currentTurn=id
    while(this.turns.size>64) this.turns.delete(this.turns.keys().next().value!)
  }
  turn(id: string) { return this.turns.get(id) }
  decision(id: string) { return this.turns.get(id)?.recommendation }
  complete(id: string) { this.turns.delete(id); if(this.currentTurn===id) this.currentTurn=undefined }
  markSkill(id?: string) { if(id) { const turn=this.turns.get(id); if(turn) turn.blocked=true } else { for(const turn of this.turns.values()) turn.blocked=true; this.pendingSkill=true }; this.revision++ }
  escalate(id?: string) {
    if(!id) { if(this.pendingEscalation) return false; this.pendingEscalation=true; this.revision++; return true }
    const turn=this.turns.get(id)
    if(!turn || turn.escalations>=1) return false
    turn.escalations++; turn.recommendation={tier:'opus',reason:'explicit-escalation',category:'explicit-profile'}; this.revision++; return true
  }
}
