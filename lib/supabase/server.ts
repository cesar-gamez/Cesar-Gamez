import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const CANVAS_SCENE_ID = "main";
export const CANVAS_MEDIA_BUCKET = "canvas-media";

function supabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return raw.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function noStoreFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, { ...init, cache: "no-store" });
}

export function createPublicSupabase(): SupabaseClient {
  const url = supabaseUrl();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase public env vars are missing");
  }
  return createClient(url, key, {
    global: { fetch: noStoreFetch },
  });
}

export function createServiceSupabase(): SupabaseClient {
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service role env vars are missing");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: noStoreFetch },
  });
}
