"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const registerSchema = z
  .object({
    email: z.string().email({ message: "Inserisci un'email valida" }),
    password: z.string().min(6, { message: "La password deve contenere almeno 6 caratteri" }),
    confirmPassword: z.string().min(6, { message: "Conferma la password" })
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"]
  });

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = (values: RegisterValues) => {
    startTransition(async () => {
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          password: values.password
        })
      });

      const data = await response.json().catch(() => ({
        error: "Errore sconosciuto"
      }));

      if (!response.ok) {
        setError(data.error ?? "Impossibile completare la registrazione");
        return;
      }

      setSuccess(
        data.message ??
          "Registrazione completata. Ora puoi accedere con le tue credenziali."
      );

      form.reset();
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Crea account
          </CardTitle>
          <CardDescription>
            Registrati per iniziare il questionario e i minigiochi.
          </CardDescription>
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
                        autoComplete="new-password"
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
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conferma password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error ? (
                <p className="text-sm font-medium text-destructive">{error}</p>
              ) : null}

              {success ? (
                <p className="text-sm font-medium text-primary">{success}</p>
              ) : null}

              <Button
                type="submit"
                className={cn("w-full", { "opacity-80": isPending })}
                disabled={isPending}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {isPending ? "Registrazione in corso..." : "Registrati"}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
          <p>
            Hai già un account?
          </p>
          <Link href="/login">Vai al login</Link>
        </CardFooter>
      </Card>
    </main>
  );
}