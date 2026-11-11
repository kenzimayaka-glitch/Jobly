import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
test("Recruiter Gmail import keeps unmatched applications in an owner-scoped intake queue", () => {
 const importRoute=read("app/api/recruiter/gmail/import/route.ts");
 const intakeApi=read("app/api/recruiter/gmail/intake/route.ts");
 const attachment=read("app/api/recruiter/gmail/attachment/route.ts");
 const migration=read("supabase/migrations/20261111020000_recruiter_gmail_intake.sql");
 const queue=read("components/recruiter/GmailIntakeQueue.tsx");
 assert.match(importRoute,/RecruiterGmailIntake/);assert.match(importRoute,/if \(!job\)/);
 assert.match(intakeApi,/eq\("recruiterUserId",g\.user\.id\)/);assert.match(intakeApi,/recruiterJobId:job\.id/);
 assert.match(attachment,/eq\("recruiterUserId",context\.user\.id\)/);
 assert.match(migration,/UNIQUE \("recruiterUserId","sourceMessageId"\)/);assert.match(migration,/ENABLE ROW LEVEL SECURITY/);
 assert.match(queue,/Candidatures à affecter/);assert.match(queue,/Voir CV/);assert.match(queue,/Affecter/);
});
