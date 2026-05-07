import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(80),
  inviteCode: z.string().min(3).max(64)
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const field = firstIssue?.path[0];
    const message = field === "password"
      ? "Heslo musí mít alespoň 8 znaků."
      : field === "email"
        ? "Zadejte platný e-mail."
        : field === "displayName"
          ? "Jméno musí mít alespoň 2 znaky."
          : field === "inviteCode"
            ? "Zadejte platný pozvací kód."
            : "Zkontrolujte zadané údaje.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { email, password, displayName, inviteCode } = parsed.data;

  const { data: invite } = await supabase
    .from("invite_codes")
    .select("*")
    .eq("code", inviteCode.trim())
    .eq("is_active", true)
    .maybeSingle();

  if (!invite || (invite.max_uses !== null && invite.used_count >= invite.max_uses)) {
    return NextResponse.json({ error: "Neplatný nebo vyčerpaný pozvací kód." }, { status: 403 });
  }

  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName }
  });

  if (error || !created.user) {
    return NextResponse.json({ error: error?.message ?? "Registrace se nepovedla." }, { status: 400 });
  }

  const { count: profileCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  await supabase.from("profiles").insert({
    id: created.user.id,
    email,
    display_name: displayName,
    role: profileCount === 0 ? "ADMIN" : "USER"
  });

  await supabase
    .from("invite_codes")
    .update({ used_count: invite.used_count + 1 })
    .eq("id", invite.id);

  await supabase.from("notification_preferences").insert({
    user_id: created.user.id,
    email_enabled: true,
    teams_enabled: false
  });

  return NextResponse.json({ ok: true });
}
