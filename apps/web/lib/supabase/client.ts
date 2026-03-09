"use client";

import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

let browserClient: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;

  browserClient = createPagesBrowserClient<Database>();
  return browserClient;
}
