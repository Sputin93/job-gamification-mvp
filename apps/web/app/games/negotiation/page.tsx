import { requireGameAccess } from "@/lib/games/guards";
import NegotiationClient from "./NegotiationClient";

export default async function NegotiationPage() {
  await requireGameAccess("negotiation");
  return <NegotiationClient />;
}