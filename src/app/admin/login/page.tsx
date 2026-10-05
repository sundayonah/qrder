"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Button } from "@/components/Button";

function LoginForm() {
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      window.location.assign(search.get("next") || "/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-16"
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase">
          Qrder
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Admin login</h1>
        <p className="text-sm text-neutral-600">
          Sign in to manage the restaurant menu.
        </p>
      </div>

      <label className="space-y-1 text-sm">
        <span className="font-medium">Email</span>
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full cursor-text rounded-xl border border-neutral-300 bg-white px-3 py-3 text-black outline-none focus:border-black"
          placeholder="you@email.com"
        />
      </label>

      <label className="space-y-1 text-sm">
        <span className="font-medium">Password</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full cursor-text rounded-xl border border-neutral-300 bg-white px-3 py-3 text-black outline-none focus:border-black"
          placeholder="••••••••"
        />
      </label>

      {error && (
        <p className="rounded-xl bg-neutral-100 px-3 py-3 text-sm text-black">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="min-h-full bg-white">
      <Suspense fallback={<p className="p-8 text-sm">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
