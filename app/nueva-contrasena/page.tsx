"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function NuevaContrasenaPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Supabase usa flujo implícito: los tokens vienen en el hash de la URL
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setError("El enlace es inválido o ha expirado. Solicita uno nuevo.");
      setReady(true);
      return;
    }

    const supabase = createClient();
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setError("El enlace ha expirado. Solicita uno nuevo.");
        }
        setReady(true);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError("No se pudo actualizar la contraseña. Intenta de nuevo.");
      return;
    }

    setSuccess(true);
    await supabase.auth.signOut();
    setTimeout(() => router.push("/login"), 2500);
  }

  return (
    <div className="min-h-screen grid grid-cols-2">
      {/* ── Panel izquierdo decorativo ── */}
      <section
        aria-hidden
        className="col-span-1 hidden lg:flex flex-1 relative overflow-hidden"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
          }}
        />
        <div
          className="absolute -top-32 -right-32 size-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-24 -left-24 size-80 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }}
        />
        <div className="relative flex flex-col items-center justify-center w-full px-16 text-white text-center gap-6">
          <div className="w-full max-w-sm rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-6 text-left shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-8 rounded-full bg-white/20" />
              <div className="flex flex-col gap-1.5">
                <div className="h-2.5 w-28 rounded-full bg-white/30" />
                <div className="h-2 w-20 rounded-full bg-white/20" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="h-2 w-full rounded-full bg-white/20" />
              <div className="h-2 w-4/5 rounded-full bg-white/20" />
              <div className="h-2 w-3/5 rounded-full bg-white/20" />
            </div>
            <div className="mt-4 h-8 w-28 rounded-md bg-white/25" />
          </div>
          <div>
            <p className="text-xl font-semibold">Tu plataforma educativa</p>
            <p className="mt-1 text-sm text-white/70">
              Gestiona cursos, alumnos y contenido en un solo lugar.
            </p>
          </div>
        </div>
      </section>

      {/* ── Panel derecho — formulario ── */}
      <section className="relative flex w-full flex-col col-span-2 lg:col-span-1 shrink-0 bg-white px-10 py-10">
        {/* Volver al login */}
        <div className="w-full max-w-md mx-auto">
          <Link
            href="/login"
            className="inline-flex items-center text-sm text-[var(--color-neutral-500)] transition-colors hover:text-[var(--color-neutral-700)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20" fill="none" className="size-5">
              <path d="M12.7083 5L7.5 10.2083L12.7083 15.4167" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Volver a iniciar sesión
          </Link>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <div className="w-full max-w-md mx-auto">
            {/* Logo */}
            <div className="flex items-center gap-2 mb-8">
              <div className="size-7 rounded-md bg-[var(--color-primary)] flex items-center justify-center">
                <span className="text-white text-xs font-bold leading-none">A</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-[var(--color-neutral-900)]">
                aula
              </span>
            </div>

            <h1 className="text-2xl font-bold text-[var(--color-neutral-900)]">
              Nueva contraseña
            </h1>
            <p className="mt-1.5 text-sm text-[var(--color-neutral-500)] mb-8">
              Ingresa tu nueva contraseña para acceder a tu cuenta.
            </p>

            {!ready ? (
              <div className="flex items-center gap-2 text-sm text-[var(--color-neutral-400)]">
                <Loader2 className="size-4 animate-spin" />
                Verificando enlace…
              </div>
            ) : success ? (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Contraseña actualizada. Redirigiendo al login…
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                    {error.includes("expirado") && (
                      <span>
                        {" "}
                        <Link href="/recuperar-contrasena" className="underline font-medium">
                          Solicitar nuevo enlace
                        </Link>
                      </span>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-[var(--color-neutral-700)]">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="pr-10"
                      required
                      disabled={!!error && error.includes("expirado")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)] transition-colors"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirm" className="text-sm font-medium text-[var(--color-neutral-700)]">
                    Confirmar contraseña
                  </label>
                  <Input
                    id="confirm"
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repite la contraseña"
                    required
                    disabled={!!error && error.includes("expirado")}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={loading || (!!error && error.includes("expirado"))}
                  className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Guardando…
                    </>
                  ) : (
                    "Actualizar contraseña"
                  )}
                </Button>

                <p className="text-center text-sm text-[var(--color-neutral-500)]">
                  ¿Recordaste tu contraseña?{" "}
                  <Link href="/login" className="text-[var(--color-primary)] hover:underline font-medium">
                    Inicia sesión
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
