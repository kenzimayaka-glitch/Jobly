export type ATSResult = { score: number; name: string; skills: string[] };

const STOP_WORDS = new Set(["avec","dans","pour","une","des","les","sur","aux","est","être","the","and","for","with","from","this","that"]);

function tokens(text: string) {
  return Array.from(new Set(
    text.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9+#.\s-]/g, " ")
      .split(/\s+/)
      .map((x) => x.trim())
      .filter((x) => x.length >= 3 && !STOP_WORDS.has(x))
  ));
}

export function calculateATSScore(cvText: string, jobDescription: string): ATSResult {
  const cv = tokens(cvText);
  const job = tokens(jobDescription);
  const cvSet = new Set(cv);
  const matched = job.filter((word) => cvSet.has(word));
  const uniqueSkills = Array.from(new Set(matched)).slice(0, 12);
  const score = job.length ? Math.min(100, Math.round((matched.length / Math.max(1, job.length)) * 100)) : 0;
  const name = score >= 80 ? "Excellent match" : score >= 65 ? "Bon match" : score >= 50 ? "Match à examiner" : "Faible match";
  return { score, name, skills: uniqueSkills };
}

export function decideStatus(score: number): "Rejeté ATS" | "À examiner" {
  return score < 50 ? "Rejeté ATS" : "À examiner";
}
