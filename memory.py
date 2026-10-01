"""Persistent offline memory, belief and reflection store."""
import json
from pathlib import Path
class MemoryStore:
    def __init__(self,root:Path):
        self.root=root; self.memory_path=root/"memory.json"; self.belief_path=root/"belief.json"; self.reflection_path=root/"reflection.log"
        self.memory=self._load(self.memory_path,{"ticks":[]}); self.belief=self._load(self.belief_path,{})
    def _load(self,p,d):
        try:return json.loads(p.read_text(encoding="utf-8"))
        except Exception:return d
    def _write(self,p,o): p.write_text(json.dumps(o,ensure_ascii=False,indent=2),encoding="utf-8")
    def record(self,tick):
        self.memory["ticks"]=(self.memory.get("ticks",[])+[tick.rationale])[-500:]
        self.belief.update({"last_belief":tick.belief,"last_prediction":tick.anticipation})
        self._write(self.memory_path,self.memory); self._write(self.belief_path,self.belief)
        with self.reflection_path.open("a",encoding="utf-8") as f:f.write(tick.reflection+"\n")
    def reflect_failure(self,first_strategy,second_strategy):
        line=f"FAILURE: {first_strategy} failed -> CHANGE_STRATEGY: {second_strategy}"
        with self.reflection_path.open("a",encoding="utf-8") as f:f.write(line+"\n")
        return line
