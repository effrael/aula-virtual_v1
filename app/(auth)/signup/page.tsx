import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "./_components/signup-form";

export default async function SignupPage() {
  const supabase = await createClient();
  const { data: exists } = await supabase.rpc("superadmin_exists");

  if (exists) redirect("/login");

  return <SignupForm />;
}
