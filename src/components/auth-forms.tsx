"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogIn, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

export function AuthForms() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password"))
    });
    setBusy(false);
    if (error) {
      setMessage("Přihlášení se nepovedlo. Zkontrolujte e-mail a heslo.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: String(form.get("email")),
        password: String(form.get("password")),
        displayName: String(form.get("displayName")),
        inviteCode: String(form.get("inviteCode"))
      })
    });

    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(payload.error ?? "Registrace se nepovedla.");
      return;
    }
    setMode("login");
    setMessage("Účet je vytvořený. Teď se přihlaste.");
  }

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_420px]">
        <section className="flex min-h-[520px] flex-col justify-center">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-md bg-rink-blue text-white">
            <TrophyIcon />
          </div>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight text-ice-900 sm:text-5xl">
            IIHF 2026 Tipovačka
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-700">
            Tipujte výsledky zápasů, medailisty a sledujte žebříček bez ručního počítání.
          </p>
        </section>

        <section className="rounded-lg border border-ice-100 bg-white p-6 shadow-soft">
          <div className="mb-5 grid grid-cols-2 rounded-md bg-ice-100 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold ${mode === "login" ? "bg-white text-ice-900 shadow-sm" : "text-slate-600"}`}
            >
              <LogIn size={16} />
              Přihlášení
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold ${mode === "register" ? "bg-white text-ice-900 shadow-sm" : "text-slate-600"}`}
            >
              <UserPlus size={16} />
              Registrace
            </button>
          </div>

          {mode === "login" ? (
            <form className="space-y-4" onSubmit={handleLogin}>
              <Field label="E-mail" name="email" type="email" />
              <Field label="Heslo" name="password" type="password" />
              <SubmitButton busy={busy} label="Přihlásit se" icon={<LogIn size={18} />} />
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleRegister}>
              <Field label="Jméno v žebříčku" name="displayName" />
              <Field label="E-mail" name="email" type="email" />
              <Field label="Heslo" name="password" type="password" />
              <Field label="Pozvací kód" name="inviteCode" icon={<KeyRound size={16} />} />
              <SubmitButton busy={busy} label="Vytvořit účet" icon={<UserPlus size={18} />} />
            </form>
          )}

          {message ? (
            <p className="mt-4 rounded-md bg-ice-100 px-3 py-2 text-sm text-ice-900">{message}</p>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  icon
}: {
  label: string;
  name: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-ice-900">
      {label}
      <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-ice-100 bg-white px-3">
        {icon}
        <input
          required
          name={name}
          type={type}
          className="min-w-0 flex-1 border-0 bg-transparent text-base outline-none"
        />
      </span>
    </label>
  );
}

function SubmitButton({ busy, label, icon }: { busy: boolean; label: string; icon: React.ReactNode }) {
  return (
    <button
      disabled={busy}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-rink-blue px-4 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
    >
      {icon}
      {busy ? "Pracuji..." : label}
    </button>
  );
}

function TrophyIcon() {
  return (
    <svg aria-hidden="true" width="25" height="25" viewBox="0 0 24 24" fill="none">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M8 6H5a3 3 0 0 0 3 3M16 6h3a3 3 0 0 1-3 3M12 13v4M8 20h8M10 17h4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
