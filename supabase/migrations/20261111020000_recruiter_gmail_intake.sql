CREATE TABLE IF NOT EXISTS public."RecruiterGmailIntake" (
  id text PRIMARY KEY,
  "recruiterUserId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "candidateUserId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "candidateEmail" text NOT NULL,
  "candidateName" text NOT NULL,
  "sourceMessageId" text NOT NULL,
  "sourceThreadId" text,
  "sourceAttachmentId" text NOT NULL,
  "sourceFilename" text NOT NULL,
  "sourceJobTitle" text,
  "atsScore" integer,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ASSIGNED','IGNORED')),
  "applicationId" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recruiter_gmail_intake_owner_message_unique UNIQUE ("recruiterUserId","sourceMessageId")
);
CREATE INDEX IF NOT EXISTS recruiter_gmail_intake_queue_idx
  ON public."RecruiterGmailIntake" ("recruiterUserId",status,"createdAt");
ALTER TABLE public."RecruiterGmailIntake" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."RecruiterGmailIntake" FROM PUBLIC, anon, authenticated;
GRANT ALL ON public."RecruiterGmailIntake" TO service_role;
