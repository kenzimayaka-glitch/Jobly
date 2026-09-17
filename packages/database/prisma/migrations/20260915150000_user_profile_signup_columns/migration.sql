-- 15/09/2026 : app/api/auth/complete-signup et app/api/auth/username/check
-- lisent/écrivent "User"."username", "firstName", "lastName", "country",
-- "privacyAcceptedAt", et "Profile"."firstName", "lastName", "phone",
-- "country" depuis leur création, mais aucune migration ni le schéma Prisma
-- ne créait ces colonnes. Résultat en base : "column User.username does not
-- exist" (ou équivalent Profile) à chaque tentative de finalisation
-- d'inscription -> "Impossible de finaliser le compte." / erreur de
-- connexion côté app, et le check de disponibilité de username échouait en
-- boucle silencieuse.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "username" TEXT,
  ADD COLUMN IF NOT EXISTS "firstName" TEXT,
  ADD COLUMN IF NOT EXISTS "lastName" TEXT,
  ADD COLUMN IF NOT EXISTS "country" TEXT,
  ADD COLUMN IF NOT EXISTS "privacyAcceptedAt" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_username_key" UNIQUE ("username");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "firstName" TEXT,
  ADD COLUMN IF NOT EXISTS "lastName" TEXT,
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "country" TEXT;

NOTIFY pgrst, 'reload schema';
