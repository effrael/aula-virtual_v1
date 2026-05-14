"use client";

import { useActionState, useState } from "react";
import { createSuperadmin, type SignupState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

export function SignupForm() {
  const [state, action, pending] = useActionState<SignupState, FormData>(
    createSuperadmin,
    undefined
  );
  const [showPassword, setShowPassword] = useState(false);

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
          <div className="flex items-center justify-center size-16 rounded-2xl bg-white/15 border border-white/20">
            <ShieldCheck className="size-8 text-white" />
          </div>
          <div>
            <p className="text-xl font-semibold">Configuración inicial</p>
            <p className="mt-1 text-sm text-white/70 max-w-xs">
              Este paso solo ocurre una vez. Estás creando la cuenta principal
              que administrará toda la plataforma.
            </p>
          </div>
          <ul className="text-left text-sm text-white/80 space-y-2 w-full max-w-xs">
            {[
              "Acceso total a la plataforma",
              "Crear cuentas de docentes y alumnos",
              "Configurar la organización",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-white/60 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
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

        {/* Formulario */}
        <div className="flex flex-1 flex-col justify-center">
          <div className="w-full max-w-sm mx-auto">
            <h1 className="text-2xl font-bold text-[var(--color-neutral-900)]">
              Crear cuenta principal
            </h1>
            <p className="mt-1.5 text-sm text-[var(--color-neutral-500)]">
              Esta cuenta tendrá acceso total a la plataforma.
            </p>

            {state?.message && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {state.message}
              </div>
            )}

            <form action={action} className="mt-8 flex flex-col gap-5">
              {/* Nombre */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="full_name"
                  className="text-sm font-medium text-[var(--color-neutral-700)]"
                >
                  Nombre completo
                </label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  autoComplete="name"
                  placeholder="Juan García"
                  aria-describedby="full_name-error"
                />
                {state?.errors?.full_name && (
                  <p id="full_name-error" className="text-xs text-red-600">
                    {state.errors.full_name[0]}
                  </p>
                )}
              </div>

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
                  placeholder="admin@escuela.com"
                  aria-describedby="email-error"
                />
                {state?.errors?.email && (
                  <p id="email-error" className="text-xs text-red-600">
                    {state.errors.email[0]}
                  </p>
                )}
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
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    className="pr-10"
                    aria-describedby="password-error"
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
                {state?.errors?.password && (
                  <ul id="password-error" className="text-xs text-red-600 space-y-0.5">
                    {state.errors.password.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                )}
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
                    Creando cuenta…
                  </>
                ) : (
                  "Crear cuenta"
                )}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
