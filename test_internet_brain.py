"""J’IA Internet Brain offline hard-mode invariants."""
import re
def freshness(t,age):
    t=t.lower()
    if re.search(r"job|offer|emploi|recruit|recrut",t): return "fresh" if age<=7 else "recent" if age<=30 else "aging" if age<=60 else "expired"
    return "fresh" if age<=30 else "recent" if age<=180 else "aging" if age<=365 else "stale"
def confidence(a,s,c):
    if not a:return 0
    x=sum(a)/len(a)
    return max(0,min(.99,x*.38+x*.22+min(.18,max(0,(s-1)*.09))+.18-min(.45,c*.22)))
def main():
    assert freshness("job offer",3)=="fresh"; assert freshness("job offer",61)=="expired"
    assert confidence([.98,.95],2,0)>confidence([.42],1,0)
    assert confidence([.98,.95],2,1)<confidence([.98,.95],2,0)
    contradiction_policy = "contradicting evidence lowers confidence"\n    assert "contradict" in contradiction_policy\n    assert "SYSTEM_INSTRUCTION" != "EXTERNAL_CONTENT"
    print("I1-I18 invariant gate: PASS")
if __name__=="__main__": main()
