DO $$
DECLARE
  conversations_rls boolean;
  messages_rls boolean;
BEGIN
  IF to_regclass('public."JiaConversation"') IS NULL THEN
    RAISE EXCEPTION 'JiaConversation table is missing';
  END IF;
  IF to_regclass('public."JiaConversationMessage"') IS NULL THEN
    RAISE EXCEPTION 'JiaConversationMessage table is missing';
  END IF;

  SELECT relrowsecurity INTO conversations_rls
  FROM pg_class WHERE oid = 'public."JiaConversation"'::regclass;
  SELECT relrowsecurity INTO messages_rls
  FROM pg_class WHERE oid = 'public."JiaConversationMessage"'::regclass;

  IF NOT conversations_rls OR NOT messages_rls THEN
    RAISE EXCEPTION 'RLS must be enabled on both J''IA conversation tables';
  END IF;

  IF has_table_privilege('anon', 'public."JiaConversation"', 'SELECT')
    OR has_table_privilege('anon', 'public."JiaConversationMessage"', 'SELECT')
    OR has_table_privilege('authenticated', 'public."JiaConversation"', 'SELECT')
    OR has_table_privilege('authenticated', 'public."JiaConversationMessage"', 'SELECT') THEN
    RAISE EXCEPTION 'anon/authenticated must not receive direct table access';
  END IF;

  IF NOT has_table_privilege('service_role', 'public."JiaConversation"', 'SELECT')
    OR NOT has_table_privilege('service_role', 'public."JiaConversation"', 'INSERT')
    OR NOT has_table_privilege('service_role', 'public."JiaConversation"', 'UPDATE')
    OR NOT has_table_privilege('service_role', 'public."JiaConversation"', 'DELETE')
    OR NOT has_table_privilege('service_role', 'public."JiaConversationMessage"', 'SELECT')
    OR NOT has_table_privilege('service_role', 'public."JiaConversationMessage"', 'INSERT')
    OR NOT has_table_privilege('service_role', 'public."JiaConversationMessage"', 'UPDATE')
    OR NOT has_table_privilege('service_role', 'public."JiaConversationMessage"', 'DELETE') THEN
    RAISE EXCEPTION 'service_role must have full CRUD privileges';
  END IF;

  IF NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'service_role') THEN
    RAISE EXCEPTION 'service_role must bypass RLS in the test environment as it does in Supabase';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."JiaConversation"'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%RECRUITER%'
      AND pg_get_constraintdef(oid) LIKE '%PARTNER%'
  ) THEN
    RAISE EXCEPTION 'conversation ecosystem allow-list constraint is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."JiaConversationMessage"'::regclass
      AND conname = 'JiaConversationMessage_conversationId_clientMessageId_key'
      AND contype = 'u'
  ) THEN
    RAISE EXCEPTION 'idempotent client message unique constraint is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."JiaConversationMessage"'::regclass
      AND contype = 'f'
      AND confrelid = 'public."JiaConversation"'::regclass
  ) THEN
    RAISE EXCEPTION 'message-to-conversation foreign key is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'JiaConversation_userId_ecosystem_lastMessageAt_idx'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'JiaConversationMessage_conversationId_createdAt_idx'
  ) THEN
    RAISE EXCEPTION 'conversation history indexes are missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('JiaConversation','JiaConversationMessage')
  ) THEN
    RAISE EXCEPTION 'Unexpected direct client RLS policies found';
  END IF;
END $$;

-- Verify the durable store's core uniqueness and ownership constraints behave.
INSERT INTO public."User" ("id") VALUES ('jia-ci-owner');
INSERT INTO public."JiaConversation" ("id","userId","ecosystem")
VALUES ('jia-ci-conversation','jia-ci-owner','TALENT');
INSERT INTO public."JiaConversationMessage"
  ("id","conversationId","role","content","clientMessageId")
VALUES ('jia-ci-message','jia-ci-conversation','user','smoke test','jia-ci-message');

DO $$
BEGIN
  BEGIN
    INSERT INTO public."JiaConversationMessage"
      ("id","conversationId","role","content","clientMessageId")
    VALUES ('jia-ci-message-duplicate','jia-ci-conversation','user','duplicate','jia-ci-message');
    RAISE EXCEPTION 'Duplicate clientMessageId was unexpectedly accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public."JiaConversation"
      ("id","userId","ecosystem")
    VALUES ('jia-ci-invalid-ecosystem','jia-ci-owner','SUPERADMIN');
    RAISE EXCEPTION 'Unsupported ecosystem was unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END $$;
