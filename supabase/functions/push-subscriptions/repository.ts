type AdminClient = {
  from(table: string): any;
};

type SubscriptionRecord = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
};

export function createSubscriptionRepository(admin: AdminClient, now = () => new Date().toISOString()) {
  return {
    async upsert(userId: string, subscription: SubscriptionRecord, userAgent = "") {
      const { data: previous, error: previousError } = await admin
        .from("billmaster_push_subscriptions")
        .select("user_id")
        .eq("endpoint", subscription.endpoint)
        .maybeSingle();
      if (previousError) throw previousError;
      const duplicate = previous?.user_id === userId;
      const { error } = await admin.from("billmaster_push_subscriptions").upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth_secret: subscription.keys.auth,
        expiration_time: subscription.expirationTime,
        user_agent: userAgent,
        updated_at: now()
      }, { onConflict: "endpoint" });
      if (error) throw error;
      return { duplicate };
    },
    async revoke(userId: string, endpoint: string) {
      const { data, error } = await admin
        .from("billmaster_push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("endpoint", endpoint)
        .select("subscription_id");
      if (error) throw error;
      return Boolean(data?.length);
    },
    async status(userId: string) {
      const { count, error } = await admin
        .from("billmaster_push_subscriptions")
        .select("subscription_id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) throw error;
      return Number(count || 0);
    },
    async acknowledge(userId: string, occurrenceKey: string) {
      const acknowledgedAt = now();
      const { error } = await admin.from("billmaster_reminder_acknowledgments").upsert({
        user_id: userId,
        occurrence_key: occurrenceKey,
        acknowledged_at: acknowledgedAt
      }, { onConflict: "user_id,occurrence_key" });
      if (error) throw error;
      return { user_id: userId, occurrence_key: occurrenceKey, acknowledged: true, acknowledged_at: acknowledgedAt };
    }
  };
}
