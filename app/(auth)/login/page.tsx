"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { login, type LoginState } from "@/app/actions/auth";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [state, action, pending] = useActionState<LoginState, FormData>(
    login,
    undefined
  );
  const searchParams = useSearchParams();
  const setupDone = searchParams.get("setup") === "done";

  return (
    <div className="min-h-screen grid grid-cols-2">
      {/* ── Panel izquierdo decorativo ── */}
      <section
        aria-hidden
        className="col-span-1 hidden lg:flex flex-1 relative overflow-hidden"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        {/* Grid pattern */}
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
          style={{
            background: "radial-gradient(circle, #ffffff 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-24 -left-24 size-80 rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, #ffffff 0%, transparent 70%)",
          }}
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
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-md bg-[var(--color-primary)] flex items-center justify-center">
            <span className="text-white text-xs font-bold leading-none">A</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-[var(--color-neutral-900)]">
            aula
          </span>
        </div>

        {/* Formulario centrado verticalmente */}
        <div className="flex flex-1 flex-col justify-center">
          <div className="w-full max-w-sm mx-auto">
            <h1 className="text-2xl font-bold text-[var(--color-neutral-900)]">
              Iniciar sesión
            </h1>
            <p className="mt-1.5 text-sm text-[var(--color-neutral-500)]">
              Ingresa tus credenciales para acceder a tu cuenta.
            </p>

            {setupDone && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Cuenta creada exitosamente. Ya puedes iniciar sesión.
              </div>
            )}

           

            <form action={action} className="mt-8 flex flex-col gap-5">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-[var(--color-neutral-700)]"
                >
                  Correo electrónico
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@correo.com"
                />
              </div>

              {/* Contraseña */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-[var(--color-neutral-700)]"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)] transition-colors"
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                  
                </div>
                 {state?.message && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {state.message}
              </div>
            )}
                <div className="flex justify-end">
                  <Link
                    href="/recuperar-contrasena"
                    className="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] hover:underline transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={pending}
                className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-press)] text-white"
              >
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Ingresando…
                  </>
                ) : (
                  "Ingresar"
                )}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
