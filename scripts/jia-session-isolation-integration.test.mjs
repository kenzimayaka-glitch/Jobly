import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync("components/JiaPresence.tsx", "utf8");
const guard = readFileSync("lib/jia/conversation-write-guard.ts", "utf8");

test("auth identity changes synchronously invalidate the old conversation generation", () => {
  assert.match(source, /supabase\.auth\.onAuthStateChange/);
  assert.match(source, /const resetForIdentityChange = \(\) => \{/);
  assert.match(source, /conversationWriteEpochRef\.current \+= 1;/);
  assert.match(source, /conversationIdRef\.current = null;/);
  assert.match(source, /conversationOwnerUserIdRef\.current = null;/);
  assert.match(source, /pendingConversationMessagesRef\.current = \[\];/);
  assert.match(source, /conversationWriteQueueRef\.current = Promise\.resolve\(\);/);
});

test("an identity change clears private Brain context and action state", () => {
  const resetStart = source.indexOf("const resetForIdentityChange = () => {");
  const resetEnd = source.indexOf("};", resetStart);
  assert.ok(resetStart >= 0 && resetEnd > resetStart);
  const reset = source.slice(resetStart, resetEnd);
  for (const token of [
    "setRecentDialogue([])",
    "setSourceLinks([])",
    "setPendingAction(null)",
    'setCommandInput("")',
    "setPanelOpen(false)",
    "externalSignalRef.current = undefined",
  ]) assert.ok(reset.includes(token), "identity reset must clear " + token);
});

test("queued messages are scoped to an owner and a session epoch", () => {
  assert.match(source, /ownerUserId: string;/);
  assert.match(source, /epoch: number;/);
  assert.match(source, /if \(!signedIn\) return;/);
  assert.match(source, /queued\.ownerUserId === session\.user\.id/);
  assert.match(source, /queued\.epoch === restoreEpoch/);
});

test("restore reconciles pending local messages before persisting them", () => {
  const mergeAt = source.indexOf("const merged = mergeJiaConversationMessages(");
  const persistAt = source.indexOf("persistConversationMessage(queued.ecosystem, queued.message)", mergeAt);
  assert.ok(mergeAt >= 0 && persistAt > mergeAt);
  assert.ok(source.indexOf("setConversationMessages(merged)", mergeAt) < persistAt);
});

test("a late Brain reply is rejected after sign-out or account change", () => {
  const sendStart = source.indexOf("const sendTextCommand = useCallback");
  const sendEnd = source.indexOf("const updateJiaWorkspace", sendStart);
  const send = source.slice(sendStart, sendEnd);
  assert.match(send, /const initiatingOwner = sessionUserIdRef\.current/);
  assert.ok((send.match(/sessionUserIdRef\.current !== initiatingOwner/g) || []).length >= 2);
  assert.ok((send.match(/conversationWriteEpochRef\.current !== initiatingEpoch/g) || []).length >= 2);
});

test("pagination rejects an older page if its account, conversation or epoch changed", () => {
  const start = source.indexOf("const loadOlderConversationMessages = useCallback");
  const end = source.indexOf("const prepareJiaApplication", start);
  const paging = source.slice(start, end);
  assert.ok((paging.match(/canWriteJiaConversation\(/g) || []).length >= 2);
  assert.match(paging, /currentSession/);
  assert.match(paging, /mergeJiaConversationMessages\(older, conversationMessagesRef\.current\)/);
});

test("late persistence failures cannot change the new account health indicator", () => {
  assert.match(source, /sessionUserIdRef\.current !== ownerUserId \|\| conversationWriteEpochRef\.current !== epoch/);
  assert.match(guard, /context\.sessionUserId === context\.ownerUserId/);
  assert.match(guard, /context\.currentEpoch === context\.capturedEpoch/);
});
