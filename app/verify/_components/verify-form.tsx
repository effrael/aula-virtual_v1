"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function VerifyForm() {
  const [code, setCode] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed) {
      router.push(`/verify/${trimmed}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Código de verificación (UUID)"
        className="text-center font-mono"
      />
      <Button
        type="submit"
        disabled={!code.trim()}
        className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white w-full"
      >
        Verificar
      </Button>
    </form>
  );
}
