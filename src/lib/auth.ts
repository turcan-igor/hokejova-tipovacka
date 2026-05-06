import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/prihlaseni");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (!profile) redirect("/prihlaseni");
  return { supabase, user: data.user, profile };
}

export async function requireAdmin() {
  const context = await requireUser();
  if (context.profile.role !== "ADMIN") redirect("/");
  return context;
}
