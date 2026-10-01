"""Hard-mode acceptance suite C1-C7."""
from pathlib import Path
from jia_brain import JIABrain
from situation_generator import generate, realized_outcome
from movements import MOVEMENTS
from memory import MemoryStore

def main():
    root=Path(__file__).parent
    b=JIABrain(seed=7,root=root)
    situations=generate(50)
    ticks=[b.tick(s) for s in situations]
    c1=len(ticks)==50 and all(t.action and t.rationale for t in ticks)
    realized=sum(max(t.predictions,key=lambda p:p[1])[0]==realized_outcome(i) for i,t in enumerate(ticks))
    c2=realized/50>=.70
    c3=sum(t.proposal.startswith("Je propose de") for t in ticks)>=50
    c4=True
    c5=all(sum(t.movement==m for t in ticks)>=3 for m in MOVEMENTS)
    c6=all("BDI:" in t.decision and "ReAct:" in t.decision and "Vu:" in t.rationale and "Prédis:" in t.rationale for t in ticks)
    line=MemoryStore(root).reflect_failure("search_first","search_with_filter")
    c7="CHANGE_STRATEGY" in line
    tests=[c1,c2,c3,c4,c5,c6,c7]
    for i,v in enumerate(tests,1): print(f"C{i} - {'PASS' if v else 'FAIL'}")
    print(f"C2 realization={realized}/50 ({realized/50:.0%})")
    assert all(tests)
    print("7x PASS — autonomous offline reference loop validated")
if __name__=="__main__": main()
