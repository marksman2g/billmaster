import { createClient } from "@supabase/supabase-js";
import { executeSubscriptionAction } from "./actions.ts";
import { createSubscriptionRepository } from "./repository.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const authHeader = request.headers.get("Authorization") || "";
    const user = await requireUser(authHeader);
    const admin = createAdminClient();
    const repository = createSubscriptionRepository(admin);
    const payload = await readJson(request);
    return json(await executeSubscriptionAction(payload, { userId: user.id, repository }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Push subscription request failed.";
    const status = /authenticated|sign in|authorization|jwt/i.test(message) ? 401 : /valid|provide|unsupported/i.test(message) ? 422 : 500;
    return json({ error: status === 500 ? "Push subscription request failed." : message }, status);
  }
});

async function requireUser(authHeader: string) {
  if (!authHeader.startsWith("Bearer ")) throw new Error("Sign in to BillMaster before changing push delivery.");
  const client = createClient(requiredEnv("SUPABASE_URL"), publicKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } }
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("BillMaster could not verify the authenticated user.");
  return data.user;
}

function createAdminClient() {
  return createClient(requiredEnv("SUPABASE_URL"), serviceKey(), { auth: { autoRefreshToken: false, persistSession: false } });
}

function publicKey() {
  const keys = readKeySet("SUPABASE_PUBLISHABLE_KEYS");
  return keys.default || Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || requiredEnv("SUPABASE_ANON_KEY");
}

function serviceKey() {
  const keys = readKeySet("SUPABASE_SECRET_KEYS");
  return keys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function readKeySet(name: string): Record<string, string> {
  try { return JSON.parse(Deno.env.get(name) || "{}"); } catch { return {}; }
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try { return await request.json(); } catch { return {}; }
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
