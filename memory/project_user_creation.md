---
name: Creación de usuarios
description: Cómo funciona el flujo completo de creación de usuarios, qué archivos intervienen, errores conocidos y decisiones de diseño
type: project
---

## Flujo de creación de usuarios

### Archivos involucrados
- `app/dashboard/users/_components/add-user-modal.tsx` — Dialog con formulario (Client Component)
- `app/actions/users.ts` — Server Action `createUser`
- `lib/queries/users.ts` — Queries de lectura de usuarios por rol

### Cómo funciona

1. `AddUserModal` abre un `Dialog` de Radix/shadcn
2. Dentro del dialog se monta `CreateUserForm` (componente separado con su propio `useActionState`)
3. Al cerrar el dialog, Radix desmonta el `DialogContent` → `CreateUserForm` se desmonta → `useActionState` se resetea automáticamente (no necesita `{open && ...}`)
4. Al submit, `createUser(prevState, formData)` se ejecuta en el servidor
5. Supabase crea el usuario en auth con `supabaseAdmin.auth.admin.createUser()`
6. Un **trigger de Supabase** crea automáticamente el perfil en la tabla `profiles` — NO hay inserción manual en el action
7. `revalidatePath` invalida la página del rol correspondiente
8. El resultado (`success` o `message`) vuelve al cliente vía `useActionState`

### Tabla `profiles`
- Columnas conocidas: `id`, `full_name`, `role`, `status`, `deleted_at`
- **NO tiene columna `email`** — el email solo está en Supabase Auth
- El perfil se crea via trigger, no manualmente

### Errores conocidos y soluciones

**Email ya existe en Supabase Auth**
- Causa: usuario previamente creado (incluso si fue eliminado de `profiles`, permanece en auth)
- Supabase devuelve `email_exists` o `user_already_exists`
- El action lo mapea a: "Este correo ya está registrado en la plataforma."
- Solución: eliminar el usuario directamente desde Supabase Dashboard → Authentication → Users

**406 de Supabase en AuthProvider**
- Causa: `.single()` devuelve 406 cuando no encuentra fila
- Solución aplicada: cambiar a `.maybeSingle()` en `components/auth-provider.tsx`

**`createUser` retorna `undefined` en logs**
- El log de Next.js muestra `createUser(prevState, {})` — el primer argumento es el estado PREVIO, no el retorno
- `{}` es cómo Next.js serializa FormData en los logs de desarrollo
- No es un error real

### Rutas de revalidación por rol
```
docente     → /dashboard/users/doc
alumno      → /dashboard/users/alumnos
colaborador → /dashboard/users/colaboradores
```

### Roles disponibles al crear usuario
- `docente`, `alumno`, `colaborador`
- `superadmin` y `admin` NO se crean desde este formulario

**Why:** El trigger de Supabase maneja la sincronización auth → profiles. Intentar hacerlo manualmente en el action rompe la creación (columna `email` no existe, conflictos con el trigger).

**How to apply:** No agregar inserción manual en `profiles` dentro de `createUser`. Confiar en el trigger.
