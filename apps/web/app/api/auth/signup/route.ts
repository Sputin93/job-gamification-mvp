import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function POST(request: Request) {
  const supabase = createSupabaseRouteHandlerClient();

  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Impossibile completare la registrazione" },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Variabili ambiente Supabase mancanti" },
      { status: 500 }
    );
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message ?? "Utente creato ma profilo non salvato" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Registrazione completata. Ora puoi accedere."
  });
}