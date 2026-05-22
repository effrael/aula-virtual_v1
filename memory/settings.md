# Aula — Módulo Settings

## Estructura de rutas

```
/dashboard/settings/organization     → Organización (implementado)
/dashboard/settings/integrations     → Integraciones (implementado)
/dashboard/settings/tutorials        → Tutoriales (placeholder)
```

---

## Archivos creados

```
app/
├── migrations/
│   ├── 08_settings.sql              # Tabla settings singleton
│   ├── 08b_settings_tagline.sql     # ALTER: añade columna tagline
│   └── 09_integrations.sql          # Tabla integrations
├── actions/
│   ├── settings.ts                  # updateOrgSettings()
│   └── integrations.ts              # saveGoogleMeetCredentials(), toggleIntegration()
└── dashboard/settings/
    ├── layout.tsx                   # Header compartido (sin nav lateral — el sidebar lo maneja)
    ├── organization/
    │   ├── page.tsx                 # Server component, fetch settings + libraryFiles
    │   └── _components/
    │       └── organization-form.tsx # Formulario cliente con MediaPicker
    ├── integrations/
    │   ├── page.tsx                 # Server component, fetch google meet integration
    │   └── _components/
    │       └── google-meet-form.tsx  # Toggle + credenciales encriptadas
    └── tutorials/
        └── page.tsx                 # Placeholder vacío

lib/
├── queries/
│   ├── settings.ts                  # getSettings()
│   └── integrations.ts              # getGoogleMeetIntegration()
└── encryption.ts                    # encrypt() / decrypt() AES-256-GCM
```

---

## 1. Organización (`/dashboard/settings/organization`)

### Estado: ✅ Implementado

### Tabla `settings` (singleton, id = 1 siempre)

```sql
create table public.settings (
  id            int  primary key default 1 check (id = 1),
  name          text not null default 'Mi Institución',
  tagline       text not null default 'Plataforma virtual',  -- añadida en 08b
  logo_url      text,
  primary_color text not null default '#000000',
  updated_at    timestamptz default now()
);
```

> **Importante:** La columna `tagline` NO estaba en `08_settings.sql` original.
> Si la tabla ya fue creada, ejecutar `08b_settings_tagline.sql` por separado:
> ```sql
> alter table public.settings add column tagline text not null default 'Plataforma virtual';
> ```

### Campos del formulario

| Campo | DB | Descripción |
|---|---|---|
| Logo | `logo_url` | Seleccionado con `MediaPicker` del bucket `library` |
| Nombre | `name` | Aparece en sidebar (TeamSwitcher) |
| Descripción | `tagline` | Aparece debajo del nombre en sidebar, ej. "Plataforma virtual" |
| Color primario | `primary_color` | Hex #rrggbb, color-picker + input texto |

### Cómo funciona el logo

- Usa `MediaPicker` con `bucket={LIBRARY_BUCKET}` y `accept="image"` — mismo bucket que library
- No hay bucket `settings` separado
- La URL seleccionada viaja como `<input type="hidden" name="logo_url" />` en el form
- Se guarda en `settings.logo_url`

### Sidebar dinámico

- `DashboardLayout` es `async` y hace `getSettings()` en cada request
- Pasa `org = { name, tagline, logo_url }` a `<AppSidebar org={org} />`
- `AppSidebar` construye el `data` internamente usando `org`
- Al guardar Organización se llama `revalidatePath("/dashboard", "layout")` para refrescar el sidebar

---

## 2. Integraciones (`/dashboard/settings/integrations`)

### Estado: ✅ Implementado (Google Meet)

### Tabla `integrations`

```sql
create table public.integrations (
  id           text primary key,       -- 'google_meet'
  enabled      boolean not null default false,
  credentials  text,                   -- JSON encriptado AES-256-GCM
  updated_at   timestamptz default now()
);
```

Fila inicial: `insert into public.integrations (id) values ('google_meet') on conflict do nothing;`

### Encriptación (`lib/encryption.ts`)

- Algoritmo: **AES-256-GCM**
- Clave: variable de entorno `ENCRYPTION_KEY` — 32 bytes en hex (64 chars)
- Generar: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Formato almacenado: `iv:authTag:ciphertext` (todo hex, separado por `:`)
- `encrypt(plaintext)` / `decrypt(encoded)` — solo se usan en server actions

### Credenciales de Google Meet

```json
{ "client_id": "xxx.apps.googleusercontent.com", "client_secret": "GOCSPX-..." }
```

Se encripta el JSON completo antes de guardar en `integrations.credentials`.

### UI (`google-meet-form.tsx`)

- Toggle activo/inactivo independiente del formulario (llama `toggleIntegration`)
- Client Secret oculto por defecto con botón ojo para revelar
- Al cargar, pre-rellena con las credenciales descifradas

### Variables de entorno requeridas

```env
ENCRYPTION_KEY=<64 chars hex>
```

---

## 3. Tutoriales (`/dashboard/settings/tutorials`)

### Estado: ⏳ Placeholder

Diseño pendiente de definir.

---

## Acceso por rol (pendiente de implementar en código)

| Sección | Roles con acceso |
|---|---|
| Organización | `superadmin`, `admin` |
| Integraciones | `superadmin` |
| Tutoriales | todos los roles del dashboard |

---

## Pendiente

- [ ] Guardar protección por rol en las páginas de settings (middleware o `redirect` en page)
- [ ] OAuth flow completo de Google Meet (intercambio de código, refresh token)
- [ ] Usar `settings.name` y `settings.logo_url` en certificados y emails
- [ ] Aplicar `settings.primary_color` como CSS variable en runtime
- [ ] Tutoriales — definir contenido y diseño
