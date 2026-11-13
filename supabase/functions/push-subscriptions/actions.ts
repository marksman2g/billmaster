type ActionContext = {
  userId: string;
  repository: {
    upsert(userId: string, subscription: PushSubscriptionRecord, userAgent?: string): Promise<{ duplicate: boolean }>;
    revoke(userId: string, endpoint: string): Promise<boolean>;
    status(userId: string): Promise<number>;
    acknowledge(userId: string, occurrenceKey: string): Promise<Record<string, unknown>>;
  };
};

type PushSubscriptionRecord = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
};

function requiredText(value: unknown, maxLength: number): string {
  const text = String(value || "").trim();
  return text && text.length <= maxLength && !/[\u0000-\u001f\u007f]/.test(text) ? text : "";
}

function validEndpoint(value: unknown): string {
  const endpoint = requiredText(value, 4096);
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" ? endpoint : "";
  } catch {
    return "";
  }
}

function normalizeSubscription(value: unknown): PushSubscriptionRecord {
  const candidate = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const keys = candidate.keys && typeof candidate.keys === "object" && !Array.isArray(candidate.keys)
    ? candidate.keys as Record<string, unknown> : {};
  const endpoint = validEndpoint(candidate.endpoint);
  const p256dh = requiredText(keys.p256dh, 4096);
  const auth = requiredText(keys.auth, 4096);
  if (!endpoint || !p256dh || !auth) throw new Error("Provide a valid HTTPS push subscription with encryption keys.");
  const expiration = candidate.expirationTime === null || candidate.expirationTime === undefined ? null : Number(candidate.expirationTime);
  if (expiration !== null && (!Number.isFinite(expiration) || expiration < 0)) throw new Error("Provide a valid push subscription expiration time.");
  return { endpoint, expirationTime: expiration, keys: { p256dh, auth } };
}

function occurrenceKey(value: unknown): string {
  const key = requiredText(value, 512);
  if (!key || /[\u0000-\u001f\u007f]/.test(key)) throw new Error("Provide a valid reminder occurrence key.");
  return key;
}

export async function executeSubscriptionAction(payload: unknown, context: ActionContext): Promise<Record<string, unknown>> {
  if (!context.userId) throw new Error("Authenticated user required.");
  const input = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
  const action = requiredText(input.action, 32);
  if (action === "enroll") {
    const subscription = normalizeSubscription(input.subscription);
    const result = await context.repository.upsert(context.userId, subscription, requiredText(input.user_agent, 512));
    return { enrolled: true, duplicate: Boolean(result.duplicate) };
  }
  if (action === "revoke") {
    const endpoint = validEndpoint(input.endpoint);
    if (!endpoint) throw new Error("Provide the HTTPS push endpoint to revoke.");
    const changed = await context.repository.revoke(context.userId, endpoint);
    return { revoked: true, changed };
  }
  if (action === "status") return { enrolled: (await context.repository.status(context.userId)) > 0 };
  if (action === "acknowledge") return context.repository.acknowledge(context.userId, occurrenceKey(input.occurrence_key));
  throw new Error("Unsupported push subscription action.");
}
