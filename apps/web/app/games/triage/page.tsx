import { requireGameAccess } from "@/lib/games/guards";
import TriageClient from "./TriageClient";

export default async function TriagePage() {
  await requireGameAccess("triage");
  return <TriageClient />;
}