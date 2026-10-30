-- LeiboMedic: esquema de base de datos para Supabase.
-- Se ejecuta UNA vez desde Supabase > SQL Editor (pegar todo y "Run").
-- Cada familia solo puede ver y modificar sus propios datos (Row Level Security).

create extension if not exists pgcrypto;

-- ───────────────────────── Familias y usuarios ─────────────────────────

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 8)),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.family_users (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text,
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create index family_users_user_idx on public.family_users (user_id);

-- ¿El usuario actual pertenece a esta familia?
create or replace function public.is_family_member(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_users
    where family_id = fid and user_id = auth.uid()
  );
$$;

-- Crear una familia y sumarse como primer integrante.
create or replace function public.create_family(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  fid uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  insert into public.families (name, created_by) values (trim(p_name), auth.uid())
  returning id into fid;
  insert into public.family_users (family_id, user_id, email)
  values (fid, auth.uid(), auth.jwt() ->> 'email');
  return fid;
end;
$$;

-- Sumarse a una familia existente con su código de invitación.
create or replace function public.join_family(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  fid uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  select id into fid from public.families where invite_code = upper(trim(p_code));
  if fid is null then
    raise exception 'Código de invitación inválido';
  end if;
  insert into public.family_users (family_id, user_id, email)
  values (fid, auth.uid(), auth.jwt() ->> 'email')
  on conflict do nothing;
  return fid;
end;
$$;

-- ───────────────────────── Datos médicos ─────────────────────────

create table public.persons (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  first_name text not null,
  last_name text,
  birth_date date,
  sex text,
  blood_type text,
  national_id text,
  health_insurance text,
  insurance_number text,
  allergies text,
  chronic_conditions text,
  medications text,
  notes text,
  created_at timestamptz not null default now(),
  unique (id, family_id)
);

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  first_name text,
  last_name text not null,
  specialty text,
  phone text,
  email text,
  address text,
  institution text,
  notes text,
  created_at timestamptz not null default now(),
  unique (id, family_id)
);

-- Qué médicos atienden a qué integrante.
create table public.person_doctors (
  family_id uuid not null references public.families (id) on delete cascade,
  person_id uuid not null,
  doctor_id uuid not null,
  primary key (person_id, doctor_id),
  foreign key (person_id, family_id) references public.persons (id, family_id) on delete cascade,
  foreign key (doctor_id, family_id) references public.doctors (id, family_id) on delete cascade
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  person_id uuid not null,
  doctor_id uuid,
  visit_date date not null default current_date,
  reason text,
  diagnosis text,
  indications text,
  notes text,
  created_at timestamptz not null default now(),
  unique (id, family_id),
  foreign key (person_id, family_id) references public.persons (id, family_id) on delete cascade,
  foreign key (doctor_id, family_id) references public.doctors (id, family_id) on delete set null (doctor_id)
);

create index visits_person_idx on public.visits (person_id, visit_date desc);
create index visits_doctor_idx on public.visits (doctor_id, visit_date desc);

-- Historial clínico: diagnósticos, cirugías, vacunas, internaciones, etc.
create table public.history_entries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  person_id uuid not null,
  entry_date date,
  kind text not null default 'otro'
    check (kind in ('diagnostico', 'cirugia', 'vacuna', 'internacion', 'alergia', 'medicacion', 'tratamiento', 'otro')),
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  foreign key (person_id, family_id) references public.persons (id, family_id) on delete cascade
);

create index history_person_idx on public.history_entries (person_id, entry_date desc);

-- Estudios y documentos subidos (foto o PDF), clasificados por la IA.
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  person_id uuid,
  doctor_id uuid,
  visit_id uuid,
  storage_path text not null,
  file_name text,
  mime_type text,
  file_size bigint,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'procesando', 'listo', 'error')),
  error_message text,
  category text,
  title text,
  study_date date,
  institution text,
  detected_patient text,
  detected_doctor text,
  detected_specialty text,
  summary text,
  findings jsonb not null default '[]'::jsonb,
  diagnoses jsonb not null default '[]'::jsonb,
  highlights jsonb not null default '[]'::jsonb,
  uploaded_by uuid references auth.users (id) on delete set null default auth.uid(),
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (person_id, family_id) references public.persons (id, family_id) on delete set null (person_id),
  foreign key (doctor_id, family_id) references public.doctors (id, family_id) on delete set null (doctor_id),
  foreign key (visit_id, family_id) references public.visits (id, family_id) on delete set null (visit_id)
);

create index documents_family_idx on public.documents (family_id, created_at desc);
create index documents_person_idx on public.documents (person_id, study_date desc);

-- ───────────────────────── Seguridad (RLS) ─────────────────────────

alter table public.families enable row level security;
alter table public.family_users enable row level security;
alter table public.persons enable row level security;
alter table public.doctors enable row level security;
alter table public.person_doctors enable row level security;
alter table public.visits enable row level security;
alter table public.history_entries enable row level security;
alter table public.documents enable row level security;

create policy "ver mi familia" on public.families
  for select using (public.is_family_member(id));
create policy "editar mi familia" on public.families
  for update using (public.is_family_member(id)) with check (public.is_family_member(id));

create policy "ver integrantes con cuenta" on public.family_users
  for select using (public.is_family_member(family_id));
create policy "salir de la familia" on public.family_users
  for delete using (user_id = auth.uid());

do $$
declare
  t text;
begin
  foreach t in array array['persons', 'doctors', 'person_doctors', 'visits', 'history_entries', 'documents'] loop
    execute format(
      'create policy "datos de mi familia" on public.%I for all
         using (public.is_family_member(family_id))
         with check (public.is_family_member(family_id))',
      t
    );
  end loop;
end;
$$;

-- ───────────────────────── Archivos (Storage) ─────────────────────────
-- Los archivos se guardan como  <family_id>/<archivo>  en un bucket privado.

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

create policy "archivos de mi familia (ver)" on storage.objects
  for select using (
    bucket_id = 'documentos'
    and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );
create policy "archivos de mi familia (subir)" on storage.objects
  for insert with check (
    bucket_id = 'documentos'
    and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );
create policy "archivos de mi familia (borrar)" on storage.objects
  for delete using (
    bucket_id = 'documentos'
    and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );
