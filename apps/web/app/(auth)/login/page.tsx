import { Suspense } from "react";
import LoginPageClient from "./login-page-client";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8">Caricamento...</div>}>
      <LoginPageClient />
    </Suspense>
  );
}