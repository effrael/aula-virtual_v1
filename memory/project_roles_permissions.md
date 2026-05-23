---
name: Sistema de roles y permisos
description: Cómo se detecta el rol, qué ve cada rol en el sidebar y qué acciones puede hacer por página
type: project
---

## Roles disponibles
`superadmin`, `admin`, `docente`, `colaborador`, `alumno`

## Dónde se lee el rol

### En el servidor (layouts y pages)
```
createClient() → supabase.auth.getUser() → user.id
supabaseAdmin → profiles → role
```

### En el cliente
`components/auth-provider.tsx` → consulta `profiles` con `.maybeSingle()` → guarda en `useAuthStore`

---

## Flujo de redirección al entrar

`middleware.ts` — solo verifica sesión activa, NO lee el rol.

`app/dashboard/page.tsx` — lee el rol y redirige:
- `alumno` → `/dashboard/courses`
- `docente` → `/dashboard/courses`
- `superadmin` / `admin` / `colaborador` → se quedan en `/dashboard` (página de estadísticas)

---

## Sidebar por rol (`components/app-sidebar.tsx`)

### Función `getNavByRole(role)`
| Rol | Items del menú |
|---|---|
| `superadmin` / `admin` | Usuarios, Cursos (completo), Medios, Configuración, Comunicación |
| `colaborador` | Usuarios, Cursos (completo), Medios, Comunicación |
| `docente` | Cursos (básico), Medios, Comunicación |
| `alumno` | — (usa NavProjects) |

### Sección renderizada
- Roles != `alumno` → `<NavMain>` (menú de gestión)
- `alumno` → `<NavProjects>` (Mis cursos, Evaluaciones, Certificados, Verificar Certificado)

---

## Permisos por página

### `/dashboard/courses` (catálogo)

Lógica en `app/dashboard/courses/page.tsx` via `getPermissionsByRole(role)`:

| Acción | superadmin / admin | colaborador | docente | alumno |
|---|---|---|---|---|
| Crear curso | ✅ | ✗ | ✗ | ✗ |
| Editar | ✅ | ✅ | ✅ | ✗ |
| Publicar / Republicar / Restaurar | ✅ | ✅ | ✗ | ✗ |
| Archivar | ✅ | ✅ | ✗ | ✗ |
| Eliminar | ✅ | ✗ | ✗ | ✗ |

Subtítulo:
- `alumno` → "Empieza con tus cursos"
- Resto → "Gestiona todos los cursos de la plataforma."

Query de cursos según rol:
- `alumno` → `getCoursesByStudent(userId)` — solo cursos donde está inscrito
- `docente` → `getCoursesByTeacher(userId)` — solo cursos donde es docente
- Resto → `getCourses()` — todos los cursos

### `/dashboard/courses/[id]` (detalle del curso)

`canEdit = role !== "alumno"`

| Elemento | alumno | otros |
|---|---|---|
| Botones agregar/editar módulo | ✗ | ✅ |
| Menú editar/activar módulo | ✗ | ✅ |
| Botón agregar lección | ✗ | ✅ |
| Sección de inscripciones | ✗ | ✅ |

### `/dashboard/users/*`
Solo accesible para roles con `NAV_USUARIOS` en sidebar: `superadmin`, `admin`, `colaborador`.
El middleware NO protege estas rutas por rol — solo por sesión.

---

## Archivos clave

| Archivo | Responsabilidad |
|---|---|
| `middleware.ts` | Protección por sesión únicamente |
| `app/dashboard/page.tsx` | Redirección por rol al entrar |
| `components/app-sidebar.tsx` | Sidebar y `getNavByRole()` |
| `app/dashboard/courses/page.tsx` | `getPermissionsByRole()` para acciones del catálogo |
| `components/course-card.tsx` | Recibe `permissions: CoursePermissions` |
| `components/course-card-actions.tsx` | Renderiza acciones según `CoursePermissions` |
| `app/dashboard/courses/[id]/_components/module-list.tsx` | Prop `canEdit` |
| `app/dashboard/courses/[id]/_components/module-item.tsx` | Prop `canEdit` |

**Why:** El middleware no consulta la BD en cada request (rendimiento). El rol se lee en cada Server Component/page que lo necesita.

**How to apply:** Para proteger una nueva ruta por rol, leer el rol en el Server Component de esa ruta (igual que en `courses/page.tsx`) y pasar `canEdit` o similar a los Client Components. No agregar lógica de rol al middleware.
