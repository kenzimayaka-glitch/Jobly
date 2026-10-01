"""J’IA autonomous brain — free/offline reference implementation.
This is operational autonomy software, not a claim of subjective consciousness.
It records concise decision rationales, never hidden chain-of-thought.
"""
import random
from dataclasses import dataclass
from pathlib import Path
from memory import MemoryStore
from movements import choose_movement_autonomously

THEORIES={"OODA":"observe-orient-decide-act","PDCA":"plan-do-check-adjust","MAPE-K":"monitor-analyze-plan-execute over knowledge","Sense-Think-Act":"sense-think-act","Sense-Plan-Act":"sense-plan-act","Perceive-Reason-Act":"perceive-reason-act","Perceive-Deliberate-Execute":"perceive-deliberate-execute","MAPE":"monitor-analyze-plan-execute","CADA":"collect-analyze-decide-act","Boyd":"fast OODA","Autonomic":"self-management","BDI":"belief-desire-intention","ReAct":"reason-action","Reflection":"post-action learning"}

@dataclass
class Tick:
    tick:int; observation:str; belief:str; analysis:str; inference:str; predictions:list; anticipation:str; desire:str; intention:str; proposal:str; decision:str; action:str; movement:str; reflection:str; rationale:str

class JIABrain:
    def __init__(self,seed=42,root=None):
        self.rng=random.Random(seed); self.tick_no=0; self.last_actions=[]
        self.memory=MemoryStore(Path(root or Path(__file__).parent))
    def novelty_score(self,candidate):
        recent=self.last_actions[-10:]
        return 1.0-(recent.count(candidate)/max(1,len(recent)))
    def _predict(self,obs):
        if "risk" in obs.lower():
            return [("seek_safe_next_step",.75),("pause",.15),("continue",.10)]
        return [("next_user_action",.70),("continue_current_task",.20),("change_direction",.10)]
    def choose_action_autonomously(self):
        candidates=["offer_help","surface_next_step","ask_for_missing_data","summarize_progress","suggest_exploration"]
        recent=self.last_actions[-10:]
        eligible=[a for a in candidates if recent.count(a)<3]
        if not eligible: eligible=candidates
        return max(((self.novelty_score(a)+self.rng.random()*.25,a) for a in eligible))[1]
    def tick(self,situation,expected=None):
        self.tick_no+=1
        obs=str(situation)
        context={"state":obs,"stability":"changing" if "change" in obs.lower() else "stable"}
        analysis=f"state={context['state']}; stability={context['stability']}"
        belief="the next useful step can be proposed without forcing execution"
        inference="current evidence supports a low-risk helpful initiative"
        predictions=self._predict(obs); best=max(predictions,key=lambda x:x[1])
        anticipation=f"{best[0]} ({best[1]:.0%})"
        desire="help the user progress safely"
        intention=self.choose_action_autonomously()
        proposal=f"Je propose de {intention.replace('_',' ')}."
        decision=f"BDI: Belief={belief}; Desire={desire}; Intention={intention}. ReAct: Decision={intention}"
        action=intention; movement=choose_movement_autonomously(self.rng,self.tick_no)
        result="success" if expected is None or expected==action else "mismatch"
        reflection=f"Reflection: {result}; novelty_score={self.novelty_score(action):.2f}; strategy retained."
        rationale=f"Vu:{obs} | Crois:{belief} | Veux:{desire} | Prédis:{best[0]}({best[1]:.0%}) | Donc je fais:{action} | Mouvement:{movement}"
        tick=Tick(self.tick_no,obs,belief,analysis,inference,predictions,anticipation,desire,intention,proposal,decision,action,movement,reflection,rationale)
        self.memory.record(tick); self.last_actions.append(action); self.last_actions=self.last_actions[-20:]
        return tick
