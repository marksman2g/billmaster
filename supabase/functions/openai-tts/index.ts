import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type JsonRecord = Record<string, unknown>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const allowedVoices = new Set(["coral", "shimmer", "ash", "verse"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  try {
    await requireUser(req);
    const body = await readJson(req);
    const text = String(body.text || "").replace(/\s+/g, " ").trim();
    if (!text) return json({ error: "Text is required." }, 400);
    if (text.length > 4096) return json({ error: "Text is too long for one voice response." }, 400);

    const voice = allowedVoices.has(String(body.voice || "")) ? String(body.voice) : "coral";
    const instructions = String(body.instructions || "Speak naturally, clearly, and warmly.").slice(0, 500);
    const openAiResponse = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requiredEnv("OPENAI_API_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_TTS_MODEL") || "gpt-4o-mini-tts",
        voice,
        input: text,
        instructions,
        response_format: "mp3"
      })
    });

    if (!openAiResponse.ok) {
      const details = await openAiResponse.text();
      console.error("OpenAI TTS error", openAiResponse.status, details.slice(0, 500));
      return json({ error: "OpenAI TTS could not create the voice response." }, 502);
    }

    return new Response(openAiResponse.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": openAiResponse.headers.get("content-type") || "audio/mpeg",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected OpenAI TTS error.";
    const status = /sign in|authorization|jwt|user/i.test(message) ? 401 : 500;
    return json({ error: message }, status);
  }
});

async function readJson(req: Request): Promise<JsonRecord> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) throw new Error("Sign in to BillMaster before using enhanced voice.");
  const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredPublicSupabaseKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } }
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("BillMaster could not verify the signed-in user.");
  return data.user;
}

function requiredPublicSupabaseKey() {
  return Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || requiredEnv("SUPABASE_ANON_KEY");
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
