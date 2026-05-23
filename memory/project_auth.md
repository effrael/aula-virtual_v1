---
name: Sistema de autenticación y signup
description: Flujo completo de login, signup de superadmin, clientes Supabase, middleware y store de auth
type: project
---

## Clientes Supabase (`lib/supabase/`)

| Archivo | Cuándo usar | Clave usada |
|---|---|---|
| `client.ts` | Client Components (`"use client"`) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `server.ts` | Server Components, layouts, pages, actions | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `admin.ts` | Solo server actions — operaciones privilegiadas | `SUPABASE_SERVICE_ROLE_KEY` |

- `client.ts` → `createBrowserClient` de `@supabase/ssr`
- `server.ts` → `createServerClient` de `@supabase/ssr`, lee/escribe cookies vía `next/headers`
- `admin.ts` → `createClient` de `@supabase/supabase-js`, sin autoRefresh ni persistSession

**NUNCA usar `supabaseAdmin` en Client Components.** La service role key no debe llegar al browser.

---

## Rutas de auth

```
app/(auth)/login/page.tsx         — formulario de login (Client Component)
app/(auth)/signup/page.tsx        — guard + render de SignupForm (Server Component)
app/(auth)/signup/_components/signup-form.tsx — formulario de signup (Client Component)
app/actions/auth.ts               — server actions: login, createSuperadmin
```

---

## Signup — solo para el superadmin inicial

El signup **no es un registro público**. Es un flujo de inicialización de la plataforma que ocurre **una sola vez**.

### Guard en `signup/page.tsx`
```
supabase.rpc("superadmin_exists") → si true → redirect("/login")
```
Si ya existe un superadmin, la página de signup redirige al login.

### Action `createSuperadmin`
1. Llama a `supabase.rpc("superadmin_exists")` de nuevo (doble verificación server-side)
2. Si ya existe → `redirect("/login")`
3. Valida con Zod: `full_name` (min 2), `email`, `password` (min 8, letra + número)
4. Llama a `supabase.auth.signUp()` con `data: { full_name, role: "superadmin" }`
5. Si error → `return { message: error.message }`
6. Si ok → `redirect("/login?setup=done")`

El trigger de Supabase crea automáticamente el perfil en `profiles` con `role: "superadmin"`.

---

## Login

### Página `login/page.tsx`
- Client Component con `useActionState`
- Muestra banner verde si `?setup=done` (viene del signup exitoso)
- Muestra `state.message` en rojo si error
- Sin validación Zod en el action (solo pasa email/password directo a Supabase)

### Action `login`
1. `supabase.auth.signInWithPassword({ email, password })`
2. Si error → `return { message: "Correo o contraseña incorrectos." }`
3. Si ok → `redirect("/dashboard")`

Nota: el `redirect("/dashboard")` en el action causa que Next.js haga una redirección 307. El middleware lo deja pasar porque ya hay sesión activa.

---

## Middleware (`middleware.ts`)

Corre en cada request excepto estáticos e imágenes.

```
/            → si no inicializado → /signup | si no logueado → /login | si logueado → /dashboard
/signup      → si ya inicializado → /login | si no → permite
/login       → si no inicializado → /signup | si logueado → /dashboard | si no → permite
/dashboard/* → si no logueado → /login | si logueado → permite
```

**Solo consulta `superadmin_exists` en rutas de auth** (`/`, `/login`, `/signup`) para evitar queries en cada request del dashboard.

El middleware **no lee el rol** — solo verifica sesión activa.

---

## AuthProvider (`components/auth-provider.tsx`)

Client Component que envuelve la app para mantener el perfil en un store global.

### Qué hace
1. Al montar: `supabase.auth.getSession()` → si hay sesión → `loadProfile(userId)`
2. Escucha `onAuthStateChange` → actualiza perfil en cada cambio de sesión
3. `loadProfile` consulta `profiles` con `.maybeSingle()` → si hay data → `setProfile()` | si no → `clear()`

### Query
```
supabase.from("profiles").select("id, full_name, role").eq("id", userId).maybeSingle()
```
Usa `.maybeSingle()` (no `.single()`) para evitar 406 cuando el perfil no existe.

---

## Auth Store (`store/auth.ts`)

Zustand store global para el perfil del usuario en el cliente.

```typescript
Profile: { id: string; full_name: string; role: Role }
Role: "superadmin" | "admin" | "docente" | "alumno" | "colaborador"

useAuthStore: {
  profile: Profile | null
  isLoading: boolean
  setProfile(profile)
  setLoading(loading)
  clear()
}
```

Úsalo en Client Components con `useAuthStore()` para acceder al perfil sin hacer queries adicionales.

---

## Logout

Implementado en `components/nav-user.tsx`:
```typescript
const supabase = createClient();  // cliente browser
await supabase.auth.signOut();
router.push("/");  // middleware redirige a /login
```

---

## Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   ← clave pública (antes ANON_KEY)
SUPABASE_SERVICE_ROLE_KEY              ← solo server, nunca exponer al cliente
```
