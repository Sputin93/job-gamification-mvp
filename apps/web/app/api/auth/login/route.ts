import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function POST(request: Request) {
  const supabase = await createSupabaseRouteHandlerClient();

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.session) {
    return NextResponse.json({ error: error?.message ?? "Credenziali non valide" }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}