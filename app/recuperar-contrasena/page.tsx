"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { requestPasswordReset } from "@/app/actions/users";

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await requestPasswordReset(email);
      setSent(true);
    });
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

        {/* Formulario centrado verticalmente */}
        <div className="w-full max-w-md mx-auto flex flex-1 flex-col justify-center">
          <div className=" mx-auto">
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
              ¿Olvidaste tu contraseña?
            </h1>
            <p className="mt-1.5 text-sm text-[var(--color-neutral-500)] mb-8">
              Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-[var(--color-neutral-700)]"
                >
                  Correo <span className="text-red-500">*</span>
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ingresa tu correo"
                  required
                  disabled={sent}
                />
                {sent && (
                  <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 my-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
                    Si el correo existe, se enviaron las instrucciones de recuperación.
                  </p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={pending || sent}
                className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white"
              >
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Enviando…
                  </>
                ) : sent ? (
                  "Enlace enviado"
                ) : (
                  "Enviar enlace de recuperación"
                )}
              </Button>

              <p className="text-center text-sm text-[var(--color-neutral-500)]">
                ¿Recordaste tu contraseña?{" "}
                <Link
                  href="/login"
                  className="text-[var(--color-primary)] hover:underline font-medium"
                >
                  Inicia sesión
                </Link>
              </p>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
