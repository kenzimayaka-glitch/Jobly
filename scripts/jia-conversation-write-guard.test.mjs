import assert from "node:assert/strict";
import test from "node:test";
import { canWriteJiaConversation, mergeJiaConversationMessages } from "../lib/jia/conversation-write-guard.ts";

const valid = {
  accessToken: "session-token",
  sessionUserId: "auth-user-a",
  ownerUserId: "auth-user-a",
  currentOwnerUserId: "auth-user-a",
  currentConversationId: "conversation-a",
  capturedConversationId: "conversation-a",
  currentEpoch: 3,
  capturedEpoch: 3,
};

test("allows a write only for the current owner, conversation and epoch", () => {
  assert.equal(canWriteJiaConversation(valid), true);
});

test("rejects writes after switching authenticated accounts", () => {
  assert.equal(canWriteJiaConversation({ ...valid, sessionUserId: "auth-user-b" }), false);
  assert.equal(canWriteJiaConversation({ ...valid, currentOwnerUserId: "auth-user-b" }), false);
});

test("rejects writes queued for an earlier conversation", () => {
  assert.equal(canWriteJiaConversation({ ...valid, currentConversationId: "conversation-b" }), false);
});

test("rejects writes queued before sign-out or a session-generation change", () => {
  assert.equal(canWriteJiaConversation({ ...valid, currentEpoch: 4 }), false);
  assert.equal(canWriteJiaConversation({ ...valid, accessToken: null }), false);
});


test("restored and queued messages merge in chronological order without duplicates", () => {
  const restored = [
    { id: "m2", createdAt: 200, text: "second" },
    { id: "m1", createdAt: 100, text: "first" },
  ];
  const queued = [
    { id: "m3", createdAt: 300, text: "third" },
    { id: "m2", createdAt: 200, text: "second with latest draft" },
  ];
  assert.deepEqual(
    mergeJiaConversationMessages(restored, queued).map(({ id, text }) => ({ id, text })),
    [
      { id: "m1", text: "first" },
      { id: "m2", text: "second with latest draft" },
      { id: "m3", text: "third" },
    ],
  );
});

test("message merge is stable for equal timestamps and does not mutate inputs", () => {
  const restored = [
    { id: "a", createdAt: 100 },
    { id: "b", createdAt: 100 },
  ];
  const queued = [{ id: "c", createdAt: 100 }];
  const merged = mergeJiaConversationMessages(restored, queued);
  assert.deepEqual(merged.map((item) => item.id), ["a", "b", "c"]);
  assert.deepEqual(restored.map((item) => item.id), ["a", "b"]);
  assert.deepEqual(queued.map((item) => item.id), ["c"]);
});
