type ReminderRequest = {
  userId: string;
  occurrenceKey: string;
  importance: "normal" | "important";
  pushEnabled?: boolean;
  smsFallbackEnabled?: boolean;
};

function validateRequest(request: ReminderRequest) {
  if (!request?.userId || !request?.occurrenceKey) throw new Error("Reminder user and occurrence are required.");
  if (!['normal', 'important'].includes(request.importance)) throw new Error("Reminder importance is invalid.");
}

function nowDate(now: () => Date) {
  const value = now();
  if (!value || typeof value.getTime !== "function" || !Number.isFinite(value.getTime())) throw new Error("Reminder clock is invalid.");
  return value;
}

function errorMessage(error: unknown) {
  const message = String((error as { message?: unknown })?.message || "").trim();
  return message ? message.slice(0, 500) : "Delivery failed.";
}

function statusCode(error: unknown) {
  return Number((error as { statusCode?: number })?.statusCode || 0);
}

export async function dispatchPushReminder(request: ReminderRequest, dependencies: Record<string, any>) {
  validateRequest(request);
  const { repository, pushProvider } = dependencies;
  const now = nowDate(dependencies.now);
  let existing = await repository.getDelivery(request.userId, request.occurrenceKey);
  if (existing?.push_status === "sent") return { status: "sent", duplicate: true, fallbackEligibleAt: existing.fallback_eligible_at || null };
  if (await repository.isAcknowledged(request.userId, request.occurrenceKey)) {
    await repository.saveDelivery(request.userId, request.occurrenceKey, { importance: request.importance, push_status: "disabled", sms_status: "acknowledged", updated_at: now.toISOString() });
    return { status: "acknowledged", duplicate: false, fallbackEligibleAt: null };
  }
  const fallbackEligibleAt = request.importance === "important" && request.smsFallbackEnabled === true
    ? new Date(now.getTime() + 15 * 60 * 1000).toISOString() : null;
  if (request.pushEnabled !== true) {
    await repository.saveDelivery(request.userId, request.occurrenceKey, {
      importance: request.importance, push_enabled: false, sms_fallback_enabled: Boolean(request.smsFallbackEnabled),
      push_status: "disabled", sms_status: fallbackEligibleAt ? "pending" : "disabled", fallback_eligible_at: fallbackEligibleAt, updated_at: now.toISOString()
    });
    return { status: "disabled", duplicate: false, fallbackEligibleAt };
  }
  if (typeof repository.claimPush === "function") {
    const claim = await repository.claimPush(request.userId, request.occurrenceKey, {
      importance: request.importance,
      push_enabled: true,
      sms_fallback_enabled: Boolean(request.smsFallbackEnabled),
      fallback_eligible_at: fallbackEligibleAt,
      sms_status: fallbackEligibleAt ? "pending" : "disabled",
      updated_at: now.toISOString()
    });
    if (!claim.claimed) {
      return { status: claim.delivery?.push_status || "pending", duplicate: true, fallbackEligibleAt: claim.delivery?.fallback_eligible_at || fallbackEligibleAt };
    }
    existing = claim.delivery;
  }
  const subscriptions = await repository.listSubscriptions(request.userId);
  if (!subscriptions.length) {
    await repository.saveDelivery(request.userId, request.occurrenceKey, {
      importance: request.importance, push_enabled: true, sms_fallback_enabled: Boolean(request.smsFallbackEnabled),
      push_status: "disabled", sms_status: fallbackEligibleAt ? "pending" : "disabled", fallback_eligible_at: fallbackEligibleAt,
      last_error: "No active push subscription.", updated_at: now.toISOString()
    });
    return { status: "disabled", duplicate: false, fallbackEligibleAt };
  }
  let sent = 0;
  const failures: string[] = [];
  for (const subscription of subscriptions) {
    try {
      await pushProvider.send(subscription, undefined);
      sent += 1;
    } catch (error) {
      failures.push(errorMessage(error));
      if ([404, 410].includes(statusCode(error))) await repository.revokeSubscription(request.userId, subscription.endpoint);
    }
  }
  const status = sent ? "sent" : "failed";
  await repository.saveDelivery(request.userId, request.occurrenceKey, {
    importance: request.importance, push_enabled: true, sms_fallback_enabled: Boolean(request.smsFallbackEnabled),
    push_status: status, push_attempts: Number(existing?.push_attempts || 0) + 1,
    push_sent_at: sent ? now.toISOString() : null, fallback_eligible_at: fallbackEligibleAt,
    sms_status: fallbackEligibleAt ? "pending" : "disabled", last_error: failures.join("; ").slice(0, 500) || null, updated_at: now.toISOString()
  });
  return { status, duplicate: false, sent, failed: failures.length, fallbackEligibleAt };
}

export async function dispatchSmsFallback(request: ReminderRequest, dependencies: Record<string, any>) {
  validateRequest(request);
  const { repository, smsProvider, policy } = dependencies;
  const now = nowDate(dependencies.now);
  if (request.importance !== "important" || request.smsFallbackEnabled !== true || !smsProvider) return { status: "disabled", duplicate: false };
  const delivery = await repository.getDelivery(request.userId, request.occurrenceKey);
  if (!delivery) return { status: "disabled", duplicate: false, reason: "push-not-recorded" };
  if (delivery.sms_status === "sent") return { status: "sent", duplicate: true };
  if (await repository.isAcknowledged(request.userId, request.occurrenceKey)) {
    await repository.saveDelivery(request.userId, request.occurrenceKey, { sms_status: "acknowledged", updated_at: now.toISOString() });
    return { status: "acknowledged", duplicate: false };
  }
  const eligibleAt = new Date(delivery.fallback_eligible_at || "");
  if (!Number.isFinite(eligibleAt.getTime()) || now < eligibleAt) return { status: "not-due", duplicate: false };
  try {
    const quote = await smsProvider.quote(request);
    const costCents = Math.ceil(Number(quote?.costCents));
    const balanceCents = Math.floor(Number(quote?.balanceCents));
    const perMessageCapCents = Math.floor(Number(policy?.perMessageCapCents));
    const monthlyCapCents = Math.floor(Number(policy?.monthlyCapCents));
    const monthSpendCents = Math.floor(Number(await repository.monthSmsSpendCents(request.userId, now)));
    let reason = "";
    if (!Number.isFinite(costCents) || costCents < 0) reason = "Provider quote is invalid.";
    else if (!Number.isFinite(perMessageCapCents) || costCents > perMessageCapCents) reason = "Estimated cost exceeds the per-message cap.";
    else if (!Number.isFinite(monthlyCapCents) || monthSpendCents + costCents > monthlyCapCents) reason = "Estimated cost exceeds the monthly cap.";
    else if (!Number.isFinite(balanceCents) || balanceCents < costCents) reason = "Provider balance is insufficient.";
    if (reason) {
      await repository.saveDelivery(request.userId, request.occurrenceKey, { sms_status: "spending_blocked", last_error: reason, updated_at: now.toISOString() });
      return { status: "spending-blocked", duplicate: false, reason };
    }
    const result = await smsProvider.send(request, { maxCostCents: costCents });
    const chargedCents = Math.max(0, Math.ceil(Number(result?.costCents ?? costCents)));
    await repository.saveDelivery(request.userId, request.occurrenceKey, {
      sms_status: "sent", sms_cost_cents: chargedCents, sms_provider_delivery_id: String(result?.providerId || ""), last_error: null, updated_at: now.toISOString()
    });
    return { status: "sent", duplicate: false, costCents: chargedCents };
  } catch (error) {
    const message = errorMessage(error);
    await repository.saveDelivery(request.userId, request.occurrenceKey, { sms_status: "failed", last_error: message, updated_at: now.toISOString() });
    return { status: "failed", duplicate: false, reason: message };
  }
}
