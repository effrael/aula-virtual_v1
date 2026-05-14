create table if not exists public.profiles (
    id        uuid references auth.users(id) on delete cascade primary key,                                        
    full_name text        not null,                                                                                
    role      text        not null check (role in ('superadmin', 'admin', 'docente', 'alumno', 'colaborador')),  
    created_at timestamptz default now()
  );

  -- 2. Habilitar RLS
  alter table public.profiles enable row level security;

  -- 3. Función pública para verificar si ya existe superadmin
  --    (security definer = bypasa RLS, corre con permisos de postgres)
  create or replace function public.superadmin_exists()
  returns boolean
  language sql
  security definer
  stable
  as $$
    select exists(select 1 from public.profiles where role = 'superadmin');
  $$;

  -- 4. Función trigger: crea el perfil automáticamente al registrar usuario
  create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
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

  -- 5. Trigger en auth.users
  drop trigger if exists on_auth_user_created on auth.users;
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();



---------- CONFIRMAR EMAIL:
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'direccion@redcuore.com';


----- RCP para listar usuarios

 alter table public.profiles                                                                                          add column status text default 'activo' check (status in ('activo', 'inactivo')),                                  add column deleted_at timestamptz default null;  


 --- get users:
 create or replace function public.get_users_by_role(p_role text)
  returns table (
    id        uuid,
    full_name text,
    role      text,
    email     text,
    status    text,
    created_at timestamptz
  )
  language sql
  security definer
  stable
  as $$
    select
      p.id,
      p.full_name,
      p.role,
      u.email,
      p.status,
      p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role = p_role
      and p.deleted_at is null
    order by p.created_at desc;
  $$;
