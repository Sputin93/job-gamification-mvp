import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import type { Database } from "@/types/database";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return { url, anonKey };
}

export async function createSupabaseServerComponentClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseConfig();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(
            ({ name, value, options }: { name: string; value: string; options?: CookieOptions }) => {
              cookieStore.set(name, value, options);
            }
          );
        } catch {}
      },
    },
  });
}

export async function createSupabaseRouteHandlerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseConfig();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(
            ({ name, value, options }: { name: string; value: string; options?: CookieOptions }) => {
              cookieStore.set(name, value, options);
            }
          );
        } catch {}
      },
    },
  });
}

export async function createSupabaseServerActionClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseConfig();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(
            ({ name, value, options }: { name: string; value: string; options?: CookieOptions }) => {
              cookieStore.set(name, value, options);
            }
          );
        } catch {}
      },
    },
  });
}