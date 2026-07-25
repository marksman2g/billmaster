import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type JsonRecord = Record<string, unknown>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

class HttpError extends Error {
  status: number;
  details?: JsonRecord;

  constructor(status: number, message: string, details?: JsonRecord) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  try {
    const body = await readJson(req);
    const action = String(body.action || "health");
    if (action === "health") return json(await plaidHealth());
    if (action === "sync_all_transactions") return json(await syncAllTransactions(req, body));
    if (action === "sync_all_liabilities") return json(await syncAllLiabilities(req, body));
    if (action === "purge_expired_data") return json(await purgeExpiredData(req, body));

    const { user, admin } = await requireUser(req);
    if (action === "create_link_token") return json(await createLinkToken(admin, user.id));
    if (action === "exchange_public_token") return json(await exchangePublicToken(admin, user.id, body));
    if (action === "complete_multi_item_link") return json(await completeMultiItemLink(admin, user.id, body));
    if (action === "list_connections") return json(await listConnections(admin, user.id));
    if (action === "sync_transactions") return json(await syncTransactions(admin, user.id, body));
    if (action === "sync_liabilities") return json(await syncLiabilities(admin, user.id, body));
    if (action === "delete_user_data") return json(await deleteUserData(admin, user.id));

    throw new HttpError(400, `Unknown Plaid sync action: ${action}`);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected Plaid sync error.";
    const details = error instanceof HttpError ? error.details : undefined;
    return json({ error: message, details }, status);
  }
});

async function readJson(req: Request): Promise<JsonRecord> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function plaidHealth() {
  const products = plaidProducts();
  const configured = {
    plaid_client_id: Boolean(Deno.env.get("PLAID_CLIENT_ID")),
    plaid_secret: Boolean(Deno.env.get("PLAID_SECRET")),
    supabase_url: Boolean(Deno.env.get("SUPABASE_URL")),
    supabase_anon_key: Boolean(publicSupabaseKey()),
    supabase_service_role_key: Boolean(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")),
    billmaster_sync_secret: Boolean(Deno.env.get("BILLMASTER_SYNC_SECRET")),
    plaid_products: products,
    plaid_products_ready: requiredPlaidProductsReady(products)
  };
  const database = await plaidDatabaseHealth();
  const requiredConfigured = [
    configured.plaid_client_id,
    configured.plaid_secret,
    configured.supabase_url,
    configured.supabase_anon_key,
    configured.supabase_service_role_key,
    configured.plaid_products_ready
  ].every(Boolean);
  const requiredDatabase = [
    database.plaid_tokens_ready,
    database.plaid_connections_ready,
    database.plaid_liabilities_ready
  ].every(Boolean);
  return {
    ok: requiredConfigured && requiredDatabase,
    plaid_env: plaidEnv(),
    configured,
    database,
    actions: ["create_link_token", "exchange_public_token", "complete_multi_item_link", "list_connections", "sync_transactions", "sync_liabilities", "delete_user_data", "sync_all_transactions", "sync_all_liabilities", "purge_expired_data"]
  };
}

async function plaidDatabaseHealth() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return {
      plaid_tokens_ready: false,
      plaid_connections_ready: false,
      plaid_liabilities_ready: false,
      message: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    };
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const tokenProbe = await admin.from("billmaster_plaid_tokens").select("item_id").limit(1);
  const connectionProbe = await admin.from("billmaster_plaid_connections").select("item_id").limit(1);
  const liabilityProbe = await admin.from("billmaster_plaid_liabilities").select("account_id").limit(1);
  return {
    plaid_tokens_ready: !tokenProbe.error,
    plaid_connections_ready: !connectionProbe.error,
    plaid_liabilities_ready: !liabilityProbe.error,
    token_error: dbErrorSummary(tokenProbe.error),
    connection_error: dbErrorSummary(connectionProbe.error),
    liability_error: dbErrorSummary(liabilityProbe.error)
  };
}

async function requireUser(req: Request) {
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) throw new HttpError(401, "Sign in before linking bank/card accounts.");

  const userClient = createClient(supabaseUrl, requiredPublicSupabaseKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } }
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "BillMaster could not verify the signed-in user.");

  const admin = adminClient();
  return { user: data.user, admin };
}

function adminClient() {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

function requireSyncSecret(req: Request) {
  const expected = Deno.env.get("BILLMASTER_SYNC_SECRET") || "";
  if (!expected) throw new HttpError(500, "Missing required secret: BILLMASTER_SYNC_SECRET");
  const provided = req.headers.get("x-billmaster-sync-secret")
    || (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (provided !== expected) throw new HttpError(401, "Invalid BillMaster scheduled sync secret.");
}

function publicSupabaseKey() {
  return Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
}

function requiredPublicSupabaseKey() {
  const value = publicSupabaseKey();
  if (!value) throw new HttpError(500, "Missing SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY.");
  return value;
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new HttpError(500, `Missing required secret: ${name}`);
  return value;
}

function plaidEnv() {
  return (Deno.env.get("PLAID_ENV") || "sandbox").toLowerCase();
}

function plaidBaseUrl() {
  const env = plaidEnv();
  if (env === "sandbox") return "https://sandbox.plaid.com";
  if (env === "development") return "https://development.plaid.com";
  if (env === "production") return "https://production.plaid.com";
  throw new HttpError(500, "PLAID_ENV must be sandbox, development, or production.");
}

function csvSecret(name: string, fallback: string[]) {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}

async function plaidPost(path: string, payload: JsonRecord) {
  const response = await fetch(`${plaidBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: requiredEnv("PLAID_CLIENT_ID"),
      secret: requiredEnv("PLAID_SECRET"),
      ...payload
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(response.status, "Plaid request failed.", {
      error_code: typeof result.error_code === "string" ? result.error_code : "",
      error_type: typeof result.error_type === "string" ? result.error_type : "",
      error_message: typeof result.error_message === "string" ? result.error_message : ""
    });
  }
  return result as JsonRecord;
}

function plaidProducts() {
  return csvSecret("PLAID_PRODUCTS", ["transactions", "liabilities"])
    .map((product) => product.toLowerCase());
}

function requiredPlaidProductsReady(products: string[]) {
  const configured = new Set(products);
  return ["transactions", "liabilities"].every((product) => configured.has(product));
}

async function createLinkToken(admin: ReturnType<typeof createClient>, userId: string) {
  const plaidUserId = await getOrCreatePlaidUserId(admin, userId);
  const result = await plaidPost("/link/token/create", {
    client_name: Deno.env.get("PLAID_CLIENT_NAME") || "BillMaster",
    country_codes: csvSecret("PLAID_COUNTRY_CODES", ["US"]),
    language: "en",
    user_id: plaidUserId,
    enable_multi_item_link: true,
    products: plaidProducts(),
    transactions: { days_requested: Number(Deno.env.get("PLAID_DAYS_REQUESTED") || 90) },
  });
  return {
    link_token: result.link_token,
    expiration: result.expiration,
    request_id: result.request_id,
    multi_item_link: true,
    plaid_user_id: plaidUserId
  };
}

async function getOrCreatePlaidUserId(admin: ReturnType<typeof createClient>, userId: string) {
  const existing = await admin
    .from("billmaster_plaid_connections")
    .select("link_metadata")
    .eq("user_id", userId)
    .limit(100);
  assertDb(existing.error, "Reading Plaid user metadata");
  for (const row of existing.data || []) {
    const metadata = isRecord(row.link_metadata) ? row.link_metadata : {};
    const plaidUserId = stringValue(metadata.plaid_user_id);
    if (plaidUserId) return plaidUserId;
  }

  const created = await plaidPost("/user/create", { client_user_id: userId });
  const plaidUserId = stringValue(created.user_id);
  if (!plaidUserId) throw new HttpError(502, "Plaid did not return a user_id for Multi-Item Link.");
  return plaidUserId;
}

async function exchangePublicToken(admin: ReturnType<typeof createClient>, userId: string, body: JsonRecord) {
  const publicToken = String(body.public_token || "");
  if (!publicToken) throw new HttpError(400, "Missing public_token from Plaid Link.");

  const exchanged = await plaidPost("/item/public_token/exchange", { public_token: publicToken });
  const itemId = String(exchanged.item_id || "");
  const accessToken = String(exchanged.access_token || "");
  if (!itemId || !accessToken) throw new HttpError(502, "Plaid did not return an item_id and access_token.");

  const metadata = isRecord(body.metadata) ? body.metadata : {};
  const plaidUserId = stringValue(body.plaid_user_id);
  const linkMetadata = plaidUserId ? { ...metadata, plaid_user_id: plaidUserId } : metadata;
  const institution = isRecord(linkMetadata.institution) ? linkMetadata.institution : {};
  const accounts = Array.isArray(linkMetadata.accounts) ? linkMetadata.accounts : [];
  const now = new Date().toISOString();

  const tokenWrite = await admin.from("billmaster_plaid_tokens").upsert({
    user_id: userId,
    item_id: itemId,
    access_token: accessToken,
    cursor: null,
    environment: plaidEnv(),
    updated_at: now
  }, { onConflict: "user_id,item_id" });
  assertDb(tokenWrite.error, "Saving Plaid token");

  const connectionWrite = await admin.from("billmaster_plaid_connections").upsert({
    user_id: userId,
    item_id: itemId,
    institution_id: stringValue(institution.institution_id),
    institution_name: stringValue(institution.name) || "Plaid item",
    status: "linked",
    accounts,
    link_metadata: linkMetadata,
    updated_at: now
  }, { onConflict: "user_id,item_id" });
  assertDb(connectionWrite.error, "Saving Plaid connection metadata");

  return {
    linked: true,
    item_id: itemId,
    institution_name: stringValue(institution.name) || "Plaid item",
    accounts_count: accounts.length,
    request_id: exchanged.request_id
  };
}

async function deleteUserData(admin: ReturnType<typeof createClient>, userId: string) {
  const tokenRead = await admin
    .from("billmaster_plaid_tokens")
    .select("item_id, access_token")
    .eq("user_id", userId);
  assertDb(tokenRead.error, "Reading Plaid tokens before deletion");

  const revokeErrors: JsonRecord[] = [];
  for (const token of tokenRead.data || []) {
    const accessToken = stringValue(token.access_token);
    if (!accessToken) continue;
    try {
      await plaidPost("/item/remove", { access_token: accessToken });
    } catch (error) {
      const details = error instanceof HttpError && error.details ? error.details : {};
      const code = stringValue(details.error_code);
      if (code !== "ITEM_NOT_FOUND") {
        revokeErrors.push({ item_id: stringValue(token.item_id), error: error instanceof Error ? error.message : "Plaid item removal failed." });
      }
    }
  }
  if (revokeErrors.length) {
    throw new HttpError(502, "Plaid access could not be fully revoked, so BillMaster kept the deletion target available for retry.", { revoke_errors: revokeErrors });
  }

  const storage = admin.storage.from("billmaster-media");
  const media = await storage.list(userId, { limit: 1000 });
  if (!media.error && media.data?.length) {
    const paths = media.data.map((file) => `${userId}/${file.name}`).filter(Boolean);
    if (paths.length) await storage.remove(paths);
  }

  const deletes = await Promise.all([
    admin.from("billmaster_plaid_liabilities").delete().eq("user_id", userId),
    admin.from("billmaster_plaid_connections").delete().eq("user_id", userId),
    admin.from("billmaster_plaid_tokens").delete().eq("user_id", userId),
    admin.from("billmaster_workspaces").delete().eq("user_id", userId)
  ]);
  deletes.forEach((result, index) => assertDb(result.error, `Deleting user data set ${index + 1}`));
  return {
    deleted: true,
    user_id: userId,
    plaid_items_revoked: (tokenRead.data || []).length,
    media_deleted: !media.error,
    deleted_at: new Date().toISOString()
  };
}

async function completeMultiItemLink(admin: ReturnType<typeof createClient>, userId: string, body: JsonRecord) {
  const linkToken = stringValue(body.link_token);
  if (!linkToken) throw new HttpError(400, "Missing link_token for Multi-Item Link completion.");
  const plaidUserId = stringValue(body.plaid_user_id);
  const result = await plaidPost("/link/token/get", { link_token: linkToken });
  const itemAdds: JsonRecord[] = [];
  const sessions = Array.isArray(result.link_sessions) ? result.link_sessions : [];
  for (const session of sessions) {
    const sessionResults = isRecord(session.results) ? session.results : {};
    for (const item of recordsArray(sessionResults.item_add_results)) itemAdds.push(item);
  }
  const topResults = isRecord(result.results) ? result.results : {};
  for (const item of recordsArray(topResults.item_add_results)) itemAdds.push(item);

  const seen = new Set<string>();
  const items = [];
  for (const item of itemAdds) {
    const publicToken = stringValue(item.public_token);
    if (!publicToken || seen.has(publicToken)) continue;
    seen.add(publicToken);
    items.push(await exchangePublicToken(admin, userId, {
      public_token: publicToken,
      plaid_user_id: plaidUserId,
      metadata: item
    }));
  }
  if (!items.length) {
    throw new HttpError(409, "Plaid has not finished returning the linked accounts yet. Wait a moment and try the sync again.");
  }
  return {
    linked: true,
    multi_item_link: true,
    item_count: items.length,
    institutions: items.map((item) => item.institution_name).filter(Boolean),
    items
  };
}

async function listConnections(admin: ReturnType<typeof createClient>, userId: string) {
  const [result, tokenResult] = await Promise.all([
    admin
    .from("billmaster_plaid_connections")
    .select("item_id, institution_id, institution_name, status, accounts, last_synced_at, updated_at, link_metadata")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false }),
    admin
      .from("billmaster_plaid_tokens")
      .select("item_id, environment, access_token")
      .eq("user_id", userId)
  ]);
  assertDb(result.error, "Reading Plaid connections");
  assertDb(tokenResult.error, "Reading Plaid connection environments");
  const tokenByItem = new Map((tokenResult.data || []).map((row) => [stringValue(row.item_id), row]));
  const refreshedAt = new Date().toISOString();
  const connections = [];

  for (const row of result.data || []) {
    const itemId = stringValue(row.item_id);
    const token = tokenByItem.get(itemId);
    const environment = stringValue(token?.environment) || "unknown";
    let accounts = Array.isArray(row.accounts) ? row.accounts : [];
    let refreshed = false;

    // Connection metadata can be stale until the first transaction sync. Refresh
    // balances here so the account picker reflects the bank right after Link.
    // Never include the access token in the response, and keep the stored metadata
    // as a fallback when Plaid is temporarily unavailable.
    const canRefresh = Boolean(token?.access_token)
      && (environment === "unknown" || environment === plaidEnv());
    if (canRefresh) {
      try {
        const accountResult = await plaidPost("/accounts/get", { access_token: token.access_token });
        const freshAccounts = Array.isArray(accountResult.accounts)
          ? (accountResult.accounts as JsonRecord[]).map(mapPlaidAccount)
          : [];
        if (freshAccounts.length) {
          accounts = freshAccounts;
          refreshed = true;
          const update = await admin
            .from("billmaster_plaid_connections")
            .update({ accounts, updated_at: refreshedAt })
            .eq("user_id", userId)
            .eq("item_id", itemId);
          assertDb(update.error, "Updating Plaid account balances");
        }
      } catch {
        // A stale metadata read is more useful than failing the entire account list.
      }
    }

    connections.push({
      item_id: itemId,
      institution_id: stringValue(row.institution_id),
      institution_name: stringValue(row.institution_name) || "Plaid item",
      status: stringValue(row.status) || "linked",
      environment,
      accounts,
      last_synced_at: stringValue(row.last_synced_at),
      updated_at: stringValue(row.updated_at),
      accounts_refreshed_at: refreshed ? refreshedAt : ""
    });
  }

  return {
    connections
  };
}

async function purgeExpiredData(req: Request, body: JsonRecord) {
  requireSyncSecret(req);
  const admin = adminClient();
  const retentionDays = clampInt(numberValue(body.retention_days), 30, 3650, 730);
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const maxUsers = clampInt(numberValue(body.max_users), 1, 100, 25);
  const workspaceRead = await admin
    .from("billmaster_workspaces")
    .select("user_id, updated_at")
    .lt("updated_at", cutoff)
    .limit(maxUsers);
  assertDb(workspaceRead.error, "Finding expired workspaces");

  const users = (workspaceRead.data || []).map((row) => stringValue(row.user_id)).filter(Boolean);
  const deleted = [];
  const errors = [];
  for (const userId of users) {
    try {
      const result = await deleteUserData(admin, userId);
      deleted.push(result);
    } catch (error) {
      errors.push({ user_id: userId, error: error instanceof Error ? error.message : "Expired-data deletion failed." });
    }
  }
  return {
    deleted_at: new Date().toISOString(),
    retention_days: retentionDays,
    cutoff,
    candidates: users.length,
    deleted_count: deleted.length,
    errors_count: errors.length,
    deleted,
    errors
  };
}

async function syncTransactions(admin: ReturnType<typeof createClient>, userId: string, body: JsonRecord) {
  const itemId = String(body.item_id || "");
  let query = admin
    .from("billmaster_plaid_tokens")
    .select("item_id, access_token, cursor")
    .eq("user_id", userId);
  if (itemId) query = query.eq("item_id", itemId);

  const { data: tokens, error } = await query;
  assertDb(error, "Reading Plaid tokens");
  if (!tokens?.length) throw new HttpError(404, "No Plaid items are linked for this user.");

  const syncedAt = new Date().toISOString();
  const items = [];
  for (const token of tokens) {
    const item = await syncOnePlaidItem(admin, userId, token, syncedAt);
    items.push(item);
  }

  return { synced_at: syncedAt, items };
}

async function syncAllTransactions(req: Request, body: JsonRecord) {
  requireSyncSecret(req);
  const admin = adminClient();
  const maxItems = clampInt(numberValue(body.max_items), 1, 25, 25);
  const { data: tokens, error } = await admin
    .from("billmaster_plaid_tokens")
    .select("user_id, item_id, access_token, cursor")
    .limit(maxItems);
  assertDb(error, "Reading Plaid tokens for scheduled sync");

  const syncedAt = new Date().toISOString();
  const items = [];
  const errors = [];
  const users = new Set<string>();
  for (const token of tokens || []) {
    const userId = stringValue(token.user_id);
    if (!userId) continue;
    users.add(userId);
    try {
      const item = await syncOnePlaidItem(admin, userId, token, syncedAt);
      items.push(item);
    } catch (error) {
      errors.push({
        user_id: userId,
        item_id: stringValue(token.item_id),
        error: error instanceof Error ? error.message : "Scheduled sync failed for this Plaid item."
      });
    }
  }

  const totals = items.reduce((summary, item) => {
    summary.accounts += Array.isArray(item.accounts) ? item.accounts.length : 0;
    summary.added += Array.isArray(item.added) ? item.added.length : 0;
    summary.modified += Array.isArray(item.modified) ? item.modified.length : 0;
    summary.removed += Array.isArray(item.removed) ? item.removed.length : 0;
    return summary;
  }, { accounts: 0, added: 0, modified: 0, removed: 0 });

  return {
    synced_at: syncedAt,
    mode: "scheduled",
    max_items: maxItems,
    users_count: users.size,
    items_count: items.length,
    errors_count: errors.length,
    totals,
    items,
    errors
  };
}

async function syncLiabilities(admin: ReturnType<typeof createClient>, userId: string, body: JsonRecord) {
  const itemId = String(body.item_id || "");
  let query = admin
    .from("billmaster_plaid_tokens")
    .select("item_id, access_token")
    .eq("user_id", userId);
  if (itemId) query = query.eq("item_id", itemId);

  const { data: tokens, error } = await query;
  assertDb(error, "Reading Plaid tokens for liability sync");
  if (!tokens?.length) throw new HttpError(404, "No Plaid items are linked for this user.");

  const syncedAt = new Date().toISOString();
  const items = [];
  for (const token of tokens) {
    const item = await syncOnePlaidLiabilityItem(admin, userId, token, syncedAt);
    items.push(item);
  }

  return { synced_at: syncedAt, items };
}

async function syncAllLiabilities(req: Request, body: JsonRecord) {
  requireSyncSecret(req);
  const admin = adminClient();
  const maxItems = clampInt(numberValue(body.max_items), 1, 25, 25);
  const { data: tokens, error } = await admin
    .from("billmaster_plaid_tokens")
    .select("user_id, item_id, access_token")
    .limit(maxItems);
  assertDb(error, "Reading Plaid tokens for scheduled liability sync");

  const syncedAt = new Date().toISOString();
  const items = [];
  const errors = [];
  const users = new Set<string>();
  for (const token of tokens || []) {
    const userId = stringValue(token.user_id);
    if (!userId) continue;
    users.add(userId);
    try {
      const item = await syncOnePlaidLiabilityItem(admin, userId, token, syncedAt);
      items.push(item);
    } catch (error) {
      errors.push({
        user_id: userId,
        item_id: stringValue(token.item_id),
        error: error instanceof Error ? error.message : "Scheduled liability sync failed for this Plaid item."
      });
    }
  }

  const totals = items.reduce((summary, item) => {
    summary.accounts += Array.isArray(item.accounts) ? item.accounts.length : 0;
    summary.liabilities += Array.isArray(item.liabilities) ? item.liabilities.length : 0;
    return summary;
  }, { accounts: 0, liabilities: 0 });

  return {
    synced_at: syncedAt,
    mode: "scheduled",
    max_items: maxItems,
    users_count: users.size,
    items_count: items.length,
    errors_count: errors.length,
    totals,
    items,
    errors
  };
}

async function syncOnePlaidItem(admin: ReturnType<typeof createClient>, userId: string, token: JsonRecord, syncedAt: string) {
  let cursor = typeof token.cursor === "string" && token.cursor ? token.cursor : null;
  let hasMore = false;
  let requests = 0;
  const added: JsonRecord[] = [];
  const modified: JsonRecord[] = [];
  const removed: JsonRecord[] = [];
  let accounts: JsonRecord[] = [];

  do {
    requests += 1;
    const page = await plaidPost("/transactions/sync", {
      access_token: token.access_token,
      cursor,
      count: 500,
      options: { include_personal_finance_category: true }
    });
    cursor = stringValue(page.next_cursor) || cursor;
    hasMore = Boolean(page.has_more);
    if (Array.isArray(page.accounts)) accounts = page.accounts as JsonRecord[];
    if (Array.isArray(page.added)) added.push(...(page.added as JsonRecord[]));
    if (Array.isArray(page.modified)) modified.push(...(page.modified as JsonRecord[]));
    if (Array.isArray(page.removed)) removed.push(...(page.removed as JsonRecord[]));
  } while (hasMore && requests < 8);

  const tokenUpdate = await admin
    .from("billmaster_plaid_tokens")
    .update({ cursor, last_synced_at: syncedAt, updated_at: syncedAt })
    .eq("user_id", userId)
    .eq("item_id", token.item_id);
  assertDb(tokenUpdate.error, "Updating Plaid cursor");

  const connectionUpdate = await admin
    .from("billmaster_plaid_connections")
    .update({ accounts, last_synced_at: syncedAt, updated_at: syncedAt })
    .eq("user_id", userId)
    .eq("item_id", token.item_id);
  assertDb(connectionUpdate.error, "Updating Plaid connection metadata");

  return {
    item_id: token.item_id,
    has_more: hasMore,
    requests,
    accounts: accounts.map(mapPlaidAccount),
    added: added.map(mapPlaidTransaction),
    modified: modified.map(mapPlaidTransaction),
    removed: removed.map((tx) => ({ transaction_id: stringValue(tx.transaction_id), account_id: stringValue(tx.account_id) }))
  };
}

async function syncOnePlaidLiabilityItem(admin: ReturnType<typeof createClient>, userId: string, token: JsonRecord, syncedAt: string) {
  const result = await plaidPost("/liabilities/get", {
    access_token: token.access_token
  });
  const accounts = Array.isArray(result.accounts) ? result.accounts as JsonRecord[] : [];
  const liabilities = isRecord(result.liabilities) ? result.liabilities : {};
  const itemId = stringValue(token.item_id) || stringValue(isRecord(result.item) ? result.item.item_id : "");
  const rows = mapPlaidLiabilityRows(userId, itemId, accounts, liabilities, syncedAt);

  if (rows.length) {
    const write = await admin
      .from("billmaster_plaid_liabilities")
      .upsert(rows, { onConflict: "user_id,account_id" });
    assertDb(write.error, "Saving Plaid liability details");
  }

  const connectionUpdate = await admin
    .from("billmaster_plaid_connections")
    .update({ last_synced_at: syncedAt, updated_at: syncedAt })
    .eq("user_id", userId)
    .eq("item_id", itemId);
  assertDb(connectionUpdate.error, "Updating Plaid liability sync timestamp");

  return {
    item_id: itemId,
    request_id: stringValue(result.request_id),
    accounts: accounts.map(mapPlaidAccount),
    liabilities: rows.map(mapPublicLiabilityRow)
  };
}

function mapPlaidLiabilityRows(userId: string, itemId: string, accounts: JsonRecord[], liabilities: JsonRecord, syncedAt: string) {
  const accountById = new Map(accounts.map((account) => [stringValue(account.account_id), account]));
  const rows: JsonRecord[] = [];

  for (const credit of recordsArray(liabilities.credit)) {
    const account = accountById.get(stringValue(credit.account_id)) || {};
    const apr = primaryApr(credit.aprs);
    rows.push({
      ...baseLiabilityRow(userId, itemId, account, credit, "credit", syncedAt),
      minimum_payment_amount: nullableNumberValue(credit.minimum_payment_amount),
      next_payment_due_date: dateValue(credit.next_payment_due_date),
      last_statement_balance: nullableNumberValue(credit.last_statement_balance),
      last_statement_issue_date: dateValue(credit.last_statement_issue_date),
      last_payment_amount: nullableNumberValue(credit.last_payment_amount),
      last_payment_date: dateValue(credit.last_payment_date),
      apr_percentage: nullableNumberValue(apr.apr_percentage),
      apr_type: stringValue(apr.apr_type),
      is_overdue: typeof credit.is_overdue === "boolean" ? credit.is_overdue : null
    });
  }

  for (const mortgage of recordsArray(liabilities.mortgage)) {
    const account = accountById.get(stringValue(mortgage.account_id)) || {};
    const interestRate = isRecord(mortgage.interest_rate) ? mortgage.interest_rate : {};
    rows.push({
      ...baseLiabilityRow(userId, itemId, account, mortgage, "mortgage", syncedAt),
      minimum_payment_amount: nullableNumberValue(mortgage.next_monthly_payment),
      next_monthly_payment: nullableNumberValue(mortgage.next_monthly_payment),
      next_payment_due_date: dateValue(mortgage.next_payment_due_date),
      last_payment_amount: nullableNumberValue(mortgage.last_payment_amount),
      last_payment_date: dateValue(mortgage.last_payment_date),
      interest_rate_percentage: nullableNumberValue(interestRate.percentage),
      origination_principal_amount: nullableNumberValue(mortgage.origination_principal_amount)
    });
  }

  for (const student of recordsArray(liabilities.student)) {
    const account = accountById.get(stringValue(student.account_id)) || {};
    rows.push({
      ...baseLiabilityRow(userId, itemId, account, student, "student", syncedAt),
      minimum_payment_amount: nullableNumberValue(student.minimum_payment_amount),
      next_payment_due_date: dateValue(student.next_payment_due_date),
      last_payment_amount: nullableNumberValue(student.last_payment_amount),
      last_payment_date: dateValue(student.last_payment_date),
      interest_rate_percentage: nullableNumberValue(student.interest_rate_percentage),
      origination_principal_amount: nullableNumberValue(student.origination_principal_amount),
      outstanding_interest_amount: nullableNumberValue(student.outstanding_interest_amount)
    });
  }

  return rows;
}

function baseLiabilityRow(userId: string, itemId: string, account: JsonRecord, liability: JsonRecord, liabilityType: string, syncedAt: string) {
  const balances = isRecord(account.balances) ? account.balances : {};
  return {
    user_id: userId,
    item_id: itemId,
    account_id: stringValue(liability.account_id),
    account_name: stringValue(account.name) || stringValue(account.official_name),
    account_type: stringValue(account.type),
    account_subtype: stringValue(account.subtype),
    liability_type: liabilityType,
    current_balance: nullableNumberValue(balances.current),
    credit_limit: nullableNumberValue(balances.limit),
    raw: liability,
    last_synced_at: syncedAt,
    updated_at: syncedAt
  };
}

function mapPublicLiabilityRow(row: JsonRecord) {
  return {
    item_id: stringValue(row.item_id),
    account_id: stringValue(row.account_id),
    account_name: stringValue(row.account_name),
    account_type: stringValue(row.account_type),
    account_subtype: stringValue(row.account_subtype),
    liability_type: stringValue(row.liability_type),
    current_balance: nullableNumberValue(row.current_balance),
    credit_limit: nullableNumberValue(row.credit_limit),
    minimum_payment_amount: nullableNumberValue(row.minimum_payment_amount),
    next_payment_due_date: stringValue(row.next_payment_due_date),
    next_monthly_payment: nullableNumberValue(row.next_monthly_payment),
    last_statement_balance: nullableNumberValue(row.last_statement_balance),
    last_statement_issue_date: stringValue(row.last_statement_issue_date),
    last_payment_amount: nullableNumberValue(row.last_payment_amount),
    last_payment_date: stringValue(row.last_payment_date),
    apr_percentage: nullableNumberValue(row.apr_percentage),
    apr_type: stringValue(row.apr_type),
    interest_rate_percentage: nullableNumberValue(row.interest_rate_percentage),
    origination_principal_amount: nullableNumberValue(row.origination_principal_amount),
    outstanding_interest_amount: nullableNumberValue(row.outstanding_interest_amount),
    is_overdue: typeof row.is_overdue === "boolean" ? row.is_overdue : null,
    last_synced_at: stringValue(row.last_synced_at)
  };
}

function recordsArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function primaryApr(value: unknown) {
  const aprs = recordsArray(value);
  return aprs.find((apr) => stringValue(apr.apr_type).toLowerCase() === "purchase_apr")
    || aprs.find((apr) => nullableNumberValue(apr.apr_percentage) !== null)
    || {};
}

function mapPlaidAccount(account: JsonRecord) {
  const balances = isRecord(account.balances) ? account.balances : {};
  return {
    account_id: stringValue(account.account_id),
    name: stringValue(account.name),
    official_name: stringValue(account.official_name),
    mask: stringValue(account.mask),
    type: stringValue(account.type),
    subtype: stringValue(account.subtype),
    current_balance: numberValue(balances.current),
    available_balance: numberValue(balances.available),
    iso_currency_code: stringValue(balances.iso_currency_code)
  };
}

function mapPlaidTransaction(tx: JsonRecord) {
  const category = isRecord(tx.personal_finance_category) ? tx.personal_finance_category : {};
  const amount = numberValue(tx.amount);
  const categoryPrimary = stringValue(category.primary) || firstString(tx.category) || "Other";
  const categoryDetailed = stringValue(category.detailed);
  return {
    transaction_id: stringValue(tx.transaction_id),
    account_id: stringValue(tx.account_id),
    name: stringValue(tx.name),
    merchant_name: stringValue(tx.merchant_name),
    category: categoryPrimary,
    category_primary: categoryPrimary,
    category_detailed: categoryDetailed,
    amount: Math.abs(amount),
    type: amount >= 0 ? "expense" : "income",
    date: stringValue(tx.date),
    authorized_date: stringValue(tx.authorized_date),
    pending: Boolean(tx.pending),
    payment_channel: stringValue(tx.payment_channel),
    iso_currency_code: stringValue(tx.iso_currency_code),
    unofficial_currency_code: stringValue(tx.unofficial_currency_code),
    source: "Plaid"
  };
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function nullableNumberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dateValue(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function clampInt(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function firstString(value: unknown) {
  return Array.isArray(value) ? value.find((item) => typeof item === "string") || "" : "";
}

function assertDb(error: unknown, label: string) {
  if (!error) return;
  const message = isRecord(error) && typeof error.message === "string" ? error.message : "Unknown database error.";
  const code = isRecord(error) && typeof error.code === "string" ? error.code : "";
  throw new HttpError(500, `${label} failed: ${message}`, {
    code,
    message,
    hint: "Run supabase/schema.sql, redeploy plaid-sync, and confirm SUPABASE_SERVICE_ROLE_KEY is the service_role key."
  });
}

function dbErrorSummary(error: unknown) {
  if (!error) return "";
  const code = isRecord(error) && typeof error.code === "string" ? error.code : "";
  const message = isRecord(error) && typeof error.message === "string" ? error.message : "Unknown database error.";
  return [code, message].filter(Boolean).join(": ");
}
