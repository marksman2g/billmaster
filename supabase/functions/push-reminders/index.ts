import { createClient } from "@supabase/supabase-js";
import * as webPush from "web-push";
import { dispatchPushReminder, dispatchSmsFallback } from "./delivery.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    requireSender(request.headers.get("Authorization") || "");
    const input = await readJson(request);
    const reminder = {
      userId: String(input.user_id || ""),
      occurrenceKey: String(input.occurrence_key || ""),
      importance: input.importance === "important" ? "important" as const : "normal" as const,
      pushEnabled: input.push_enabled === true,
      smsFallbackEnabled: input.sms_fallback_enabled === true
    };
    const repository = reminderRepository(createAdminClient());
    if (input.action === "push") return json(await dispatchPushReminder(reminder, { repository, pushProvider: createPushProvider(), now: () => new Date() }));
    if (input.action === "fallback") return json(await dispatchSmsFallback(reminder, {
      repository,
      smsProvider: syntheticSmsProvider(),
      policy: { perMessageCapCents: numberEnv("SMS_PER_MESSAGE_CAP_CENTS", 5), monthlyCapCents: numberEnv("SMS_MONTHLY_CAP_CENTS", 100) },
      now: () => new Date()
    }));
    return json({ error: "Unsupported reminder sender action." }, 422);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reminder delivery failed.";
    const status = /authorization|sender token/i.test(message) ? 401 : /required|invalid|unsupported/i.test(message) ? 422 : 500;
    return json({ error: status === 500 ? "Reminder delivery failed." : message }, status);
  }
});

function reminderRepository(admin: ReturnType<typeof createClient>) {
  return {
    async getDelivery(userId: string, occurrenceKey: string) {
      const { data, error } = await admin.from("billmaster_reminder_deliveries").select("*").eq("user_id", userId).eq("occurrence_key", occurrenceKey).maybeSingle();
      if (error) throw error;
      return data;
    },
    async saveDelivery(userId: string, occurrenceKey: string, patch: Record<string, unknown>) {
      const { data, error } = await admin.from("billmaster_reminder_deliveries").upsert({ user_id: userId, occurrence_key: occurrenceKey, ...patch }, { onConflict: "user_id,occurrence_key" }).select("*").single();
      if (error) throw error;
      return data;
    },
    async claimPush(userId: string, occurrenceKey: string, patch: Record<string, unknown>) {
      const { data, error } = await admin.rpc("billmaster_claim_push_reminder", {
        p_user_id: userId,
        p_occurrence_key: occurrenceKey,
        p_importance: patch.importance,
        p_push_enabled: patch.push_enabled,
        p_sms_fallback_enabled: patch.sms_fallback_enabled,
        p_fallback_eligible_at: patch.fallback_eligible_at
      });
      if (error) throw error;
      return data;
    },
    async listSubscriptions(userId: string) {
      const { data, error } = await admin.from("billmaster_push_subscriptions").select("endpoint,p256dh,auth_secret").eq("user_id", userId);
      if (error) throw error;
      return (data || []).map((row) => ({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth_secret } }));
    },
    async revokeSubscription(userId: string, endpoint: string) {
      const { error } = await admin.from("billmaster_push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
      if (error) throw error;
    },
    async isAcknowledged(userId: string, occurrenceKey: string) {
      const { data, error } = await admin.from("billmaster_reminder_acknowledgments").select("acknowledged_at").eq("user_id", userId).eq("occurrence_key", occurrenceKey).maybeSingle();
      if (error) throw error;
      return Boolean(data?.acknowledged_at);
    },
    async monthSmsSpendCents(userId: string, now: Date) {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
      const { data, error } = await admin.from("billmaster_reminder_deliveries").select("sms_cost_cents").eq("user_id", userId).eq("sms_status", "sent").gte("updated_at", start);
      if (error) throw error;
      return (data || []).reduce((sum, row) => sum + Number(row.sms_cost_cents || 0), 0);
    }
  };
}

function createPushProvider() {
  const vapidDetails = { subject: requiredEnv("VAPID_SUBJECT"), publicKey: requiredEnv("VAPID_PUBLIC_KEY"), privateKey: requiredEnv("VAPID_PRIVATE_KEY") };
  return { send(subscription: Record<string, unknown>, payload: undefined) { return webPush.sendNotification(subscription, payload, { vapidDetails, TTL: 300, urgency: "high" }); } };
}

function syntheticSmsProvider() {
  if (Deno.env.get("BILLMASTER_SMS_MODE") !== "synthetic") return null;
  return {
    async quote() { return { costCents: numberEnv("SYNTHETIC_SMS_COST_CENTS", 1), balanceCents: numberEnv("SYNTHETIC_SMS_BALANCE_CENTS", 1000) }; },
    async send() { return { providerId: `synthetic-${crypto.randomUUID()}`, costCents: numberEnv("SYNTHETIC_SMS_COST_CENTS", 1) }; }
  };
}

function requireSender(header: string) {
  const expected = requiredEnv("BILLMASTER_REMINDER_SENDER_TOKEN");
  const actual = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!constantTimeEqual(actual, expected)) throw new Error("Invalid reminder sender token.");
}

function constantTimeEqual(actual: string, expected: string) {
  if (actual.length !== expected.length || !actual.length) return false;
  let different = 0;
  for (let index = 0; index < actual.length; index += 1) different |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return different === 0;
}

function createAdminClient() {
  return createClient(requiredEnv("SUPABASE_URL"), serviceKey(), { auth: { autoRefreshToken: false, persistSession: false } });
}

function serviceKey() {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    if (keys.default) return keys.default;
  } catch { }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try { return await request.json(); } catch { return {}; }
}

function numberEnv(name: string, fallback: number) {
  const value = Number(Deno.env.get(name));
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
