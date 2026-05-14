# Aula — Documentación del módulo Superadmin

## Contexto del proyecto

**Aula** es una plataforma LMS (Learning Management System) SaaS de modelo **high ticket**. El dueño del software (desarrollador) vende el servicio a instituciones educativas, despliega cada instancia en un VPS propio usando Docker, y el cliente nunca recibe el código fuente. El soporte se cobra por separado.

- **Modelo de deploy:** Single-tenant por cliente (un VPS por institución)
- **VPS:** Hostinger
- **Stack:** Next.js 16 + Supabase + Zustand + shadcn/ui + Tailwind CSS 4

---

## Stack técnico

| Tecnología | Uso |
|---|---|
| Next.js 16 (App Router) | Frontend + Server Actions |
| Supabase | Auth + PostgreSQL + Storage |
| Zustand 5 | Estado global del cliente (perfil del usuario) |
| shadcn/ui + Radix UI | Componentes de UI |
| Tailwind CSS 4 | Estilos |
| Zod 4 | Validación de formularios en server actions |
| Sonner | Notificaciones toast |
| @supabase/ssr | Manejo de sesión con cookies en Next.js |
| pnpm | Gestor de paquetes |

---

## Roles del sistema

| Rol | Descripción |
|---|---|
| `superadmin` | Dueño de la instancia. Creado una sola vez al desplegar. Acceso total. |
| `admin` | Gestiona usuarios y cursos. Creado por el superadmin. |
| `docente` | Gestiona sus propios cursos y alumnos. |
| `alumno` | Accede solo a los cursos en los que fue inscrito. |
| `colaborador` | Acceso parcial, definido por el admin. |

---

## Variables de entorno (.env)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # clave pública (anon key)
SUPABASE_SERVICE_ROLE_KEY=              # clave privada (solo server-side)
DB_PASSWORD=
```

---

## Base de datos (Supabase)

### Tabla: `profiles`

Vinculada a `auth.users` de Supabase. Se crea automáticamente vía trigger al registrar un usuario.

```sql
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  full_name   text        not null,
  role        text        not null check (role in ('superadmin', 'admin', 'docente', 'alumno', 'colaborador')),
  status      text        default 'activo' check (status in ('activo', 'inactivo')),
  deleted_at  timestamptz default null,
  created_at  timestamptz default now()
);
```

- `status` → estado operativo del usuario
- `deleted_at` → soft delete. Si tiene fecha = eliminado lógicamente. Siempre filtrar `where deleted_at is null`

### Trigger: auto-crear perfil al registrar usuario

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'alumno')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### RPC: `superadmin_exists()`

Verifica si ya existe un superadmin. Usada en middleware y en la página `/signup`.

```sql
create or replace function public.superadmin_exists()
returns boolean language sql security definer stable as $$
  select exists(select 1 from public.profiles where role = 'superadmin');
$$;
```

### RPC: `get_users_by_role(p_role text)`

Retorna usuarios activos (no eliminados) filtrados por rol. Hace join con `auth.users` para traer el email.

```sql
create or replace function public.get_users_by_role(p_role text)
returns table (
  id         uuid,
  full_name  text,
  role       text,
  email      text,
  status     text,
  created_at timestamptz
)
language sql security definer stable as $$
  select p.id, p.full_name, p.role, u.email, p.status, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = p_role
    and p.deleted_at is null
  order by p.created_at desc;
$$;
```

---

## Flujo de autenticación y rutas

### Lógica del middleware (`middleware.ts`)

```
GET /
  → si no hay superadmin → redirect /signup
  → si no está logueado  → redirect /login
  → si está logueado     → redirect /dashboard

GET /signup
  → si ya existe superadmin → redirect /login
  → si no existe            → mostrar formulario

GET /login
  → si no hay superadmin → redirect /signup
  → si ya está logueado  → redirect /dashboard
  → si no está logueado  → mostrar formulario

GET /dashboard/*
  → si no está logueado → redirect /login
  → si está logueado    → permitir acceso
```

### Creación del superadmin (`/signup`)

- Solo accesible una vez (cuando no existe ningún superadmin)
- Crea usuario en `auth.users` vía `supabase.auth.signUp()`
- El trigger crea automáticamente el perfil en `profiles` con `role: 'superadmin'`
- Al completar → redirect `/login?setup=done`
- La confirmación de email está **deshabilitada** en Supabase (Authentication → Settings → Email)

### Login (`/login`)

- Server action `login()` en `app/actions/auth.ts`
- Usa `supabase.auth.signInWithPassword()`
- Al completar → redirect `/dashboard`

---

## Estado global — Zustand (`store/auth.ts`)

```typescript
interface AuthStore {
  profile: Profile | null;   // { id, full_name, role }
  isLoading: boolean;
  setProfile: (profile) => void;
  setLoading: (loading) => void;
  clear: () => void;
}
```

El `AuthProvider` (`components/auth-provider.tsx`) inicializa el store al montar la app y escucha `onAuthStateChange` de Supabase para mantener el estado sincronizado.

**Uso en cualquier componente:**
```tsx
const { profile, isLoading } = useAuthStore();
// profile.role → 'superadmin' | 'admin' | 'docente' | 'alumno' | 'colaborador'
// profile.full_name → nombre del usuario
```

---

## Clientes de Supabase

| Archivo | Cliente | Uso |
|---|---|---|
| `lib/supabase/client.ts` | `createBrowserClient` | Componentes cliente (`"use client"`) |
| `lib/supabase/server.ts` | `createServerClient` | Server components y server actions |
| `lib/supabase/admin.ts` | `createClient` con service role | Server actions que requieren permisos de admin |

> **Regla:** Nunca usar `supabaseAdmin` en componentes cliente. La `SUPABASE_SERVICE_ROLE_KEY` solo existe en el servidor.

---

## Estructura de archivos del módulo Usuarios

```
app/
├── actions/
│   ├── auth.ts              # login, createSuperadmin
│   └── users.ts             # createUser, updateUser, deleteUser, changeUserRole
├── (auth)/
│   ├── login/page.tsx       # Página de login
│   └── signup/page.tsx      # Página de creación de superadmin (una sola vez)
├── dashboard/
│   ├── layout.tsx           # Layout con sidebar compartido
│   ├── page.tsx             # Dashboard principal (KPIs, tablas resumen, acciones rápidas)
│   └── users/
│       ├── page.tsx                        # Vista general: 3 tablas, 5 filas c/u
│       ├── doc/page.tsx                    # Docentes completo
│       ├── alumnos/page.tsx                # Alumnos completo
│       ├── colaboradores/page.tsx          # Colaboradores completo
│       └── _components/
│           ├── users-table.tsx             # Tabla reutilizable (recibe role, data, limit)
│           ├── add-user-modal.tsx          # Modal agregar (rol opcional con Select)
│           ├── edit-user-modal.tsx         # Modal editar (nombre + email)
│           ├── delete-user-confirm.tsx     # Confirmación de eliminación
│           ├── change-role-modal.tsx       # Modal cambio de rol
│           └── mock-data.ts               # Datos estáticos (referencia, no se usan)
lib/
├── supabase/
│   ├── client.ts            # Cliente browser
│   ├── server.ts            # Cliente server (cookies)
│   └── admin.ts             # Cliente admin (service role)
└── queries/
    └── users.ts             # getUsersByRole() — consulta via RPC
store/
└── auth.ts                  # Zustand store de autenticación
components/
└── auth-provider.tsx        # Inicializa store y escucha cambios de sesión
```

---

## Server Actions de usuarios (`app/actions/users.ts`)

### `createUser(prev, formData)`
Crea un usuario en Supabase Auth con `email_confirm: true`. El trigger crea el perfil automáticamente.
**Campos:** `full_name`, `email`, `password`, `role`

### `updateUser(userId, prev, formData)`
Actualiza email en `auth.users` y `full_name` en `profiles`. No cambia el rol (para eso está `changeUserRole`).
**Campos:** `full_name`, `email`

### `deleteUser(userId)`
Soft delete: setea `deleted_at = now()` y `status = 'inactivo'` en `profiles`. Banea al usuario en Supabase Auth (`ban_duration: '876000h'`).

### `changeUserRole(userId, newRole)`
Cambia el rol en `auth.users` metadata y en `profiles`. Si el usuario estaba eliminado, lo restaura (`deleted_at: null`, `status: 'activo'`). Resuelve el caso de querer reutilizar el email de un usuario eliminado con otro rol.

> **Importante:** Todas las operaciones sobre `profiles` usan `supabaseAdmin` (service role) para bypasar RLS.

---

## Componente `UsersTable`

Componente cliente reutilizable:

```typescript
interface UsersTableProps {
  role: "docente" | "alumno" | "colaborador";
  data: UserRow[];
  limit?: number;        // Si se pasa, muestra solo N filas
  showViewAll?: boolean; // Muestra link "Ver todos" al pie
  action?: ReactNode;    // Slot para botón de agregar
}
```

- Dropdown por fila con: **Editar**, **Cambiar rol**, **Eliminar**
- Después de cada acción llama `router.refresh()` para refrescar datos del servidor
- Estado vacío cuando no hay usuarios: `"No hay {rol} registrados."`

---

## Decisiones de arquitectura tomadas

### Soft delete
Los usuarios eliminados no se borran de la BD — se marcan con `deleted_at` y se banean en Supabase Auth. Esto preserva el historial (cursos, evaluaciones, etc.) y permite restaurar usuarios.

### Reutilización de email entre roles
Si un usuario fue eliminado y se quiere agregar con otro rol, NO se crea un nuevo usuario — se usa `changeUserRole` que restaura el registro existente y cambia el rol.

### Inscripción de alumnos a cursos
- **Modelo elegido:** Inscripción explícita
- El alumno **no ve todos los cursos** — solo los que el admin/docente le asigna
- Requiere tabla `enrollments` (pendiente)
- Un alumno puede crearse sin cursos asignados y asignarse después

---

## Próximos pasos

1. Crear módulo de **Cursos** (tabla `courses` + CRUD completo)
2. Crear tabla `enrollments` (inscripción de alumnos a cursos)
3. Implementar **sidebar dinámico** por rol (filtrar items según `profile.role` del store)
4. Conectar **KPIs del dashboard** a datos reales de Supabase
5. Implementar vistas del rol **Docente**
6. Implementar vistas del rol **Alumno**
