"""50 deterministic autonomous situations and outcomes."""
SITUATIONS=("new job search","profile gap","pending application","new notification","career planning","offer comparison","resume update","interview preparation","skill gap","company discovery","salary question","location constraint","mobility need","new message","saved offer","application follow-up","recruiter visit","partner visit","talent visit","quiet session","rapid navigation","long pause","new document","new certificate","new skill","portfolio update","cover letter draft","interview result","offer deadline","calendar change","search refinement","filter change","new company","new role","new city","language switch","goal review","progress review","task completion","task failure","network opportunity","training opportunity","mentor opportunity","application rejection","application success","duplicate offer","stale offer","source update","privacy-sensitive page","risk warning")
def generate(n=50): return [SITUATIONS[i%len(SITUATIONS)] for i in range(n)]
def realized_outcome(index):
    # Deterministic benchmark: 40/50 predictions are realized, 10 are deliberate counterfactuals.
    if index % 5 == 0:
        return "counterfactual_change"
    return "seek_safe_next_step" if "risk" in SITUATIONS[index%len(SITUATIONS)] else "next_user_action"
