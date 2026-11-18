import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

const MOCK_SUPABASE_URL = "https://mock.supabase.co";

function getMockGlobalOptions() {
  if (env.NEXT_PUBLIC_SUPABASE_URL !== MOCK_SUPABASE_URL) {
    return undefined;
  }
  return {
    fetch: async () =>
      new Response(
        JSON.stringify({ message: "Mock Supabase client cannot perform network requests" }),
        { status: 400, headers: { "content-type": "application/json" } },
      ),
  };
}

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
      global: getMockGlobalOptions(),
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
      global: getMockGlobalOptions(),
    },
  );
}

/**
 * Default singleton admin client for server-side domain services
 */
export const supabaseAdmin = createAdminSupabaseClient();
