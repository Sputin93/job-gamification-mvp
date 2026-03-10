import { NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseRouteHandlerClient();
  await supabase.auth.signOut();
  const redirectUrl = new URL("/", request.url);
  return NextResponse.redirect(redirectUrl);
}