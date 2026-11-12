import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Creates an anonymous public Supabase client for client-side queries.
 */
export function createBrowserSupabaseClient() {
  return createSupabaseJsClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    },
  );
}

/**
 * Creates an admin / service-role Supabase client.
 * RESTRICTED: Used ONLY by background Inngest workers and system audit writers.
 * Never expose this client to the frontend or unauthenticated route handlers.
 */
export function createAdminSupabaseClient() {
  return createSupabaseJsClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

/**
 * Default singleton admin client for server-side domain services
 */
export const supabaseAdmin = createAdminSupabaseClient();
