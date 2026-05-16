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
  const [loginEmail, setLoginEmail] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: String(form.get("password"))
      });
      if (error) {
        setMessage("Přihlášení se nepovedlo. Zkontrolujte e-mail a heslo.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setMessage("Přihlášení se nepovedlo. Zkuste to prosím znovu.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password: String(form.get("password")),
          displayName: String(form.get("displayName")),
          inviteCode: String(form.get("inviteCode"))
        })
      });
      const payload = await parseJson(response);
      if (!response.ok) {
        setMessage(payload.error ?? "Registrace se nepovedla.");
        return;
      }
      setLoginEmail(email);
      setMode("login");
      setMessage("Účet je vytvořený. Teď se přihlaste.");
    } catch {
      setMessage("Registrace se nepovedla. Zkuste to prosím znovu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:py-10">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_420px] lg:gap-8">
        <section className="flex flex-col justify-center lg:min-h-[520px]">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-md bg-rink-blue text-white lg:mb-6">
            <TrophyIcon />
          </div>
          <h1 className="max-w-2xl text-3xl font-bold leading-tight text-ice-900 dark:text-slate-100 sm:text-5xl">
            IIHF 2026 Tipovačka
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-slate-700 dark:text-slate-300 lg:mt-5 lg:text-lg lg:leading-8">
            Tipujte výsledky zápasů, medailisty a sledujte žebříček bez ručního počítání.
          </p>
        </section>

        <section className="rounded-lg border border-ice-100 bg-white p-6 shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-5 grid grid-cols-2 rounded-md bg-ice-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode("login")}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-md text-sm font-semibold ${
                mode === "login" ? "bg-white text-ice-900 shadow-sm dark:bg-slate-950 dark:text-slate-100" : "text-slate-600 dark:text-slate-300"
              }`}
            >
              <LogIn size={16} />
              Přihlášení
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode("register")}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-md text-sm font-semibold ${
                mode === "register" ? "bg-white text-ice-900 shadow-sm dark:bg-slate-950 dark:text-slate-100" : "text-slate-600 dark:text-slate-300"
              }`}
            >
              <UserPlus size={16} />
              Registrace
            </button>
          </div>

          {mode === "login" ? (
            <form key="login" className="space-y-4" onSubmit={handleLogin}>
              <Field label="E-mail" name="email" type="email" defaultValue={loginEmail} disabled={busy} />
              <Field label="Heslo" name="password" type="password" minLength={8} disabled={busy} />
              <SubmitButton busy={busy} label="Přihlásit se" icon={<LogIn size={18} />} />
            </form>
          ) : (
            <form key="register" className="space-y-4" onSubmit={handleRegister}>
              <Field label="Jméno v žebříčku" name="displayName" disabled={busy} />
              <Field label="E-mail" name="email" type="email" disabled={busy} />
              <Field
                label="Heslo"
                name="password"
                type="password"
                minLength={8}
                hint="Heslo musí mít alespoň 8 znaků."
                disabled={busy}
              />
              <Field label="Pozvací kód" name="inviteCode" icon={<KeyRound size={16} />} disabled={busy} />
              <SubmitButton busy={busy} label="Vytvořit účet" icon={<UserPlus size={18} />} />
            </form>
          )}

          {message ? (
            <p className="mt-4 rounded-md bg-ice-100 px-3 py-2 text-sm text-ice-900 dark:bg-slate-800 dark:text-slate-100">{message}</p>
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
  icon,
  minLength,
  hint,
  defaultValue,
  disabled
}: {
  label: string;
  name: string;
  type?: string;
  icon?: React.ReactNode;
  minLength?: number;
  hint?: string;
  defaultValue?: string;
  disabled: boolean;
}) {
  return (
    <label className="block text-sm font-semibold text-ice-900 dark:text-slate-100">
      {label}
      <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-ice-100 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
        {icon}
        <input
          required
          disabled={disabled}
          name={name}
          type={type}
          minLength={minLength}
          defaultValue={defaultValue}
          className="min-w-0 flex-1 border-0 bg-transparent text-base outline-none disabled:opacity-70"
        />
      </span>
      {hint ? <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">{hint}</span> : null}
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

async function parseJson(response: Response): Promise<{ error?: string }> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
