"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email({ message: "Inserisci un'email valida" }),
  password: z.string().min(6, { message: "La password deve contenere almeno 6 caratteri" })
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPageClient() {
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  const onSubmit = (values: LoginValues) => {
    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Errore sconosciuto" }));
        setError(data.error ?? "Impossibile completare il login");
        return;
      }

      window.location.href = redirectTo;
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold tracking-tight">Benvenuto</CardTitle>
          <CardDescription>Accedi per proseguire con i questionari e la dashboard gamificata.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="tu@esempio.com"
                        type="email"
                        autoComplete="email"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

              <Button
                type="submit"
                className={cn("w-full", { "opacity-80": isPending })}
                disabled={isPending}
              >
                <LogIn className="mr-2 h-4 w-4" />
                {isPending ? "Accesso in corso..." : "Accedi"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
          <p>Non hai un account?</p>
          <Link href="/register">Crea un account</Link>
          <Link href="/">Torna alla landing</Link>
        </CardFooter>
      </Card>
    </main>
  );
}