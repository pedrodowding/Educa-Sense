-- Módulo de Expansão Escolar (Fase 1)
-- Foco: Comunicação (Mural), Importação em Massa e Logs

-- 1. Mural de Avisos (School Bulletin)
-- Permite comunicação unidirecional da Escola/Professor para Pais/Alunos
create table if not exists public.school_bulletin_posts (
  id uuid default gen_random_uuid() primary key,
  school_id uuid references public.schools(id) on delete cascade not null,
  author_user_id uuid references auth.users(id) not null,
  class_id uuid references public.classes(id) on delete cascade, -- Se NULL, é um aviso global da escola
  title text not null,
  content text not null,
  type text check (type in ('notice', 'event', 'homework', 'alert')) default 'notice',
  pinned boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS para Mural
alter table public.school_bulletin_posts enable row level security;

-- Leitura: Membros da escola podem ver posts da sua escola
create policy "School members can view bulletin posts"
  on public.school_bulletin_posts for select
  using (
    exists (
      select 1 from public.school_members
      where school_id = public.school_bulletin_posts.school_id
      and user_id = auth.uid()
    )
  );

-- Escrita: Apenas Diretores e Professores podem criar posts
create policy "Staff can create bulletin posts"
  on public.school_bulletin_posts for insert
  with check (
    exists (
      select 1 from public.school_members
      where school_id = public.school_bulletin_posts.school_id
      and user_id = auth.uid()
      and role in ('director', 'teacher')
    )
  );

-- 2. Logs de Importação em Massa
-- Para rastrear o status de uploads de CSV/Excel
create table if not exists public.school_import_logs (
  id uuid default gen_random_uuid() primary key,
  school_id uuid references public.schools(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  filename text not null,
  status text check (status in ('pending', 'processing', 'completed', 'failed')) default 'pending',
  total_records integer default 0,
  processed_records integer default 0,
  error_log jsonb default '[]'::jsonb, -- Lista de erros por linha
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS para Import Logs
alter table public.school_import_logs enable row level security;

create policy "Staff can view import logs"
  on public.school_import_logs for select
  using (
    exists (
      select 1 from public.school_members
      where school_id = public.school_import_logs.school_id
      and user_id = auth.uid()
      and role in ('director', 'teacher')
    )
  );

create policy "Staff can insert import logs"
  on public.school_import_logs for insert
  with check (
    exists (
      select 1 from public.school_members
      where school_id = public.school_import_logs.school_id
      and user_id = auth.uid()
      and role in ('director', 'teacher')
    )
  );

-- Índices para performance
create index if not exists idx_bulletin_school on public.school_bulletin_posts(school_id);
create index if not exists idx_bulletin_class on public.school_bulletin_posts(class_id);
create index if not exists idx_import_school on public.school_import_logs(school_id);
