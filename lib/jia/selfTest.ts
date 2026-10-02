import { JIA_LEXICON, understandJiaWord, type JiaLexiconLanguage } from "@/lib/jia/lexicon";
import { evaluate } from "@/lib/jia/autonomy";

export function runJiaAutonomySelfTest() {
  const languageResults = (Object.keys(JIA_LEXICON) as JiaLexiconLanguage[]).map((language) => {
    const words = Object.keys(JIA_LEXICON[language]).filter((word) => understandJiaWord(word)?.language === language);
    return { language, understoodWords: words, passed: words.length >= 5 };
  });

  const scenarios = [
    { id: "jobs_idle_match", path: "/jobs", idleMs: 15000, matchingOffers: 4 },
    { id: "application_followup", path: "/candidatures", idleMs: 12000, pendingApplications: 2 },
    { id: "profile_gap", path: "/career-os", idleMs: 10000, profileCompletion: 55 },
  ].map((input) => ({
    expected: input.id,
    passed: evaluate({
      path: input.path,
      lastAction: "",
      recentActions: [],
      idleMs: input.idleMs,
      matchingOffers: input.matchingOffers,
      pendingApplications: input.pendingApplications,
      profileCompletion: input.profileCompletion,
    }).some((candidate) => candidate.id === input.id),
  }));

  return {
    autonomyLoop: "observe → evaluate → decide → act",
    languages: languageResults,
    scenarios,
    passed: languageResults.every((x) => x.passed) && scenarios.every((x) => x.passed),
  };
}
