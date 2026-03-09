import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

const validSteps = ["profilo", "competenze", "preferenze"] as const;
const payloadSchema = z.object({
  responses: z.record(z.any())
});

export async function GET(request: Request, { params }: { params: { step: string } }) {
  const supabase = createSupabaseRouteHandlerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  if (!validSteps.includes(params.step as any)) {
    return NextResponse.json({ error: "Step non valido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("questionnaire_responses")
    .select("responses")
    .eq("profile_id", session.user.id)
    .eq("step", params.step)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ responses: data?.responses ?? null });
}

export async function POST(request: Request, { params }: { params: { step: string } }) {
  const supabase = createSupabaseRouteHandlerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  if (!validSteps.includes(params.step as any)) {
    return NextResponse.json({ error: "Step non valido" }, { status: 400 });
  }
  const json = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const { error } = await supabase
    .from("questionnaire_responses")
    .upsert(
      {
        profile_id: session.user.id,
        step: params.step,
        responses: parsed.data.responses,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "profile_id,step"
      }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("profiles").update({ onboarding_step: params.step }).eq("id", session.user.id);

  return NextResponse.json({ success: true });
}
