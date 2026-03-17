-- Logs de Auditoria para o Mural da Escola
-- Rastreia criação, atualização e exclusão de posts

create table if not exists public.school_bulletin_logs (
  id uuid default gen_random_uuid() primary key,
  school_id uuid references public.schools(id) on delete cascade not null,
  post_id uuid references public.school_bulletin_posts(id) on delete set null,
  user_id uuid references auth.users(id) not null,
  action text not null check (action in ('create', 'update', 'delete', 'pin', 'unpin')),
  details jsonb default '{}'::jsonb, -- Detalhes da mudança (ex: campos alterados)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS para Logs
alter table public.school_bulletin_logs enable row level security;

-- Apenas Staff (Diretor/Professor) pode ver logs da sua escola
create policy "Staff can view bulletin logs"
  on public.school_bulletin_logs for select
  using (
    exists (
      select 1 from public.school_members
      where school_id = public.school_bulletin_logs.school_id
      and user_id = auth.uid()
      and role in ('director', 'teacher')
    )
  );

-- Inserção pode ser feita via trigger ou aplicação. Vamos permitir insert para staff também.
create policy "Staff can insert bulletin logs"
  on public.school_bulletin_logs for insert
  with check (
    exists (
      select 1 from public.school_members
      where school_id = public.school_bulletin_logs.school_id
      and user_id = auth.uid()
      and role in ('director', 'teacher')
    )
  );

-- Índices
create index if not exists idx_bulletin_logs_school on public.school_bulletin_logs(school_id);
create index if not exists idx_bulletin_logs_post on public.school_bulletin_logs(post_id);
