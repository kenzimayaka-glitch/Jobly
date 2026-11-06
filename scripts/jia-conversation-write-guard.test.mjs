import assert from "node:assert/strict";
import test from "node:test";
import { canWriteJiaConversation } from "../lib/jia/conversation-write-guard.ts";

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
