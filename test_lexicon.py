import json
from pathlib import Path
p=Path(__file__).parent/"data"/"jia"/"lexicon.json"
d=json.loads(p.read_text(encoding="utf-8"))
counts={k:len(v) for k,v in d.items()}
assert all(counts.get(k,0)>=300 for k in ("fr","en","es")), counts
print(f"PASS C4 — {sum(counts.values())}/900+ entries; {counts}")
