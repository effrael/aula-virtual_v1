"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore, type Profile } from "@/store/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setProfile, setLoading, clear } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile(userId: string) {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", userId)
        .single<Profile>();

      if (data) {
        setProfile(data);
      } else {
        clear();
      }
    }

    // Carga inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        clear();
      }
    });

    // Escucha cambios de sesión (login / logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        clear();
      }
    });

    return () => subscription.unsubscribe();
  }, [setProfile, setLoading, clear]);

  return <>{children}</>;
}
