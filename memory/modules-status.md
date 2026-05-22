# Aula — Estado activo/inactivo de módulos

## Decisión de diseño

Los módulos **no se eliminan**. En lugar de hard delete o soft delete, se manejan con estado `is_active`. Esto preserva el historial de progreso de los alumnos y permite reactivar módulos sin perder datos.

---

## Columna añadida

```sql
-- app/migrations/07_module_status.sql
alter table public.modules
  add column is_active boolean not null default true;
```

---

## Cambios en queries (`lib/queries/modules.ts`)

- `ModuleRow.is_active: boolean` añadido al tipo
- SELECT actualizado: `id, title, position, is_active`
- `.map()` incluye `is_active: m.is_active`

---

## Server action (`app/actions/modules.ts`)

```ts
export async function toggleModuleStatus(
  id: string,
  courseId: string,
  isActive: boolean
): Promise<ModuleActionResult>
```

Actualiza `modules.is_active` vía `supabaseAdmin` y llama `revalidatePath`.

**No existe `deleteModule` en la UI** — se eliminó del dropdown. El dropdown solo tiene:
- Editar módulo
- Activar / Desactivar módulo

---

## UI (`module-item.tsx`)

- Header del módulo: `bg-primary` si activo, `bg-[var(--color-neutral-400)]` si inactivo
- Badge "Inactivo" con icono `EyeOff` visible cuando `!module.is_active`
- `handleToggleStatus` usa `useTransition` + toast de resultado

---

## Tipos de lección (`lib/queries/modules.ts`)

`LessonRow.type` es `"video" | "link" | "quiz"` (no solo `"video" | "link"`).

Los schemas Zod en `app/actions/modules.ts` usan `discriminatedUnion` con las tres variantes:
- `video` → requiere `video_id: uuid`
- `link` → requiere `external_url: url`
- `quiz` → sin campo extra; al crear, auto-inserta fila en `quizzes`

---

## Bug fix: stale useActionState en dialogs

**Problema:** Al reabrir un dialog de crear/editar módulo o lección, aparecía el toast de éxito de la acción anterior porque `state.success` persistía.

**Solución:** Añadir `key` con prefijo único a cada dialog en `module-list.tsx` para forzar remount en cada apertura:

```tsx
<CreateModuleDialog key={`create-module-${createModuleOpen}`} ... />
<EditModuleDialog   key={`edit-module-${editingModule?.id ?? "none"}`} ... />
<CreateLessonDialog key={`create-lesson-${createLessonModuleId ?? "none"}`} ... />
<EditLessonDialog   key={`edit-lesson-${editingLesson?.id ?? "none"}`} ... />
```

> Usar `"none"` en lugar de `"closed"` porque varios dialogs cerrrados simultáneamente generaban `key="closed"` duplicado — error de React.
