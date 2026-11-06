export type JiaConversationWriteContext = {
  accessToken?: string | null;
  sessionUserId?: string | null;
  ownerUserId?: string | null;
  currentOwnerUserId?: string | null;
  currentConversationId?: string | null;
  capturedConversationId?: string | null;
  currentEpoch: number;
  capturedEpoch: number;
};

/**
 * A queued conversation write is valid only while the authenticated identity,
 * owning identity, conversation id and session generation still match.
 */
export function canWriteJiaConversation(context: JiaConversationWriteContext): boolean {
  return Boolean(
    context.accessToken &&
    context.sessionUserId &&
    context.ownerUserId &&
    context.sessionUserId === context.ownerUserId &&
    context.currentOwnerUserId === context.ownerUserId &&
    context.currentConversationId &&
    context.currentConversationId === context.capturedConversationId &&
    context.currentEpoch === context.capturedEpoch
  );
}
