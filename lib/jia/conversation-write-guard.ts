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


export type JiaConversationMessageOrder = {
  id: string;
  createdAt: number;
};

/**
 * Reconcile a server page with messages queued while the initial restore was
 * in flight. The queued message wins on duplicate IDs because it may contain
 * a newer workspace draft. The resulting thread is stable and chronological.
 */
export function mergeJiaConversationMessages<T extends JiaConversationMessageOrder>(
  restored: readonly T[],
  queued: readonly T[],
): T[] {
  const byId = new Map<string, { message: T; order: number }>();
  let order = 0;
  for (const message of restored) {
    if (message && typeof message.id === "string") byId.set(message.id, { message, order: order++ });
  }
  for (const message of queued) {
    if (message && typeof message.id === "string") {
      const previous = byId.get(message.id);
      byId.set(message.id, { message, order: previous?.order ?? order++ });
    }
  }
  return [...byId.values()]
    .sort((left, right) => {
      const leftTime = Number.isFinite(left.message.createdAt) ? left.message.createdAt : 0;
      const rightTime = Number.isFinite(right.message.createdAt) ? right.message.createdAt : 0;
      return leftTime - rightTime || left.order - right.order;
    })
    .map((item) => item.message);
}
