import { requireGameAccess } from "@/lib/games/guards";
import GoNoGoClient from "./GoNoGoClient";

export default async function GoNoGoPage() {
  await requireGameAccess("gonogo");
  return <GoNoGoClient />;
}