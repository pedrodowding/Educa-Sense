Dashboard de Evolução Inteligente do Aluno (Educa Sense)
Objetivo Estratégico

Transformar a tela atual de "Relatórios > Evolução Detalhada" em um dashboard pedagógico completo, que:

gere engajamento emocional na criança

transmita confiança pedagógica aos pais

mostre progresso real e mensurável

utilize inteligência do Eduzinho AI para gerar insights automáticos

Esta sprint é crítica para retenção, percepção de valor e monetização futura.

Problemas atuais identificados

Problemas críticos:

Não existe cálculo real de progresso

Notas não estão sendo registradas corretamente

Não existe evolução temporal

XP não está conectado ao progresso pedagógico

Não existe indicador de consistência

Não existe narrativa de evolução

Não existe inteligência pedagógica automatizada

Resultado esperado após Sprint

Nova tela deverá mostrar:

progresso geral (%)

progresso por matéria (%)

gráfico de evolução temporal

streak de consistência

taxa de conclusão

taxa de acerto

insights automáticos do Eduzinho AI

Arquitetura de Dados (Backend)
1. Criar tabela child_activity_progress

supabase/migrations/20260215000000_child_activity_progress.sql

create table if not exists child_activity_progress (
  id uuid primary key default gen_random_uuid(),

  child_id uuid not null references children(id) on delete cascade,

  activity_id uuid not null,

  subject text not null,

  completed boolean default false,

  score numeric default 0,

  max_score numeric default 100,

  accuracy numeric generated always as (
    case
      when max_score > 0 then (score / max_score)
      else 0
    end
  ) stored,

  xp_earned integer default 0,

  completed_at timestamp with time zone,

  created_at timestamp with time zone default now()
);

create index idx_child_progress_child_id
on child_activity_progress(child_id);

create index idx_child_progress_completed_at
on child_activity_progress(completed_at);

2. Criar função SQL para resumo do progresso
create or replace function get_child_progress_summary(p_child_id uuid)
returns json
language plpgsql
as $$
declare
  result json;
begin

select json_build_object(

  'total_activities',
  count(*),

  'completed_activities',
  count(*) filter (where completed = true),

  'completion_rate',
  case
    when count(*) > 0
    then count(*) filter (where completed = true)::numeric / count(*)
    else 0
  end,

  'average_accuracy',
  coalesce(avg(accuracy), 0),

  'total_xp',
  coalesce(sum(xp_earned), 0),

  'streak_days',
  (
    select count(distinct completed_at::date)
    from child_activity_progress
    where child_id = p_child_id
    and completed = true
    and completed_at > now() - interval '7 days'
  )

)
into result
from child_activity_progress
where child_id = p_child_id;

return result;

end;
$$;

3. Criar função para progresso por matéria
create or replace function get_child_progress_by_subject(p_child_id uuid)
returns table (
  subject text,
  completion_rate numeric,
  average_accuracy numeric,
  total_xp integer
)
language sql
as $$
select

subject,

count(*) filter (where completed = true)::numeric /
nullif(count(*),0) as completion_rate,

avg(accuracy) as average_accuracy,

sum(xp_earned) as total_xp

from child_activity_progress
where child_id = p_child_id
group by subject;
$$;

Frontend Implementation

Criar novo componente:

components/dashboard/StudentProgressDashboard.tsx

Estrutura visual

Ordem dos blocos:

Progresso geral

Gráfico de evolução

Progresso por matéria

Consistência

Insights do Eduzinho

Bloco 1. Progresso geral

Mostrar:

barra de progresso %

total XP

taxa de conclusão

taxa de acerto

Exemplo visual:

<ProgressCard
  title="Progresso geral"
  completionRate={progress.completion_rate}
  accuracy={progress.average_accuracy}
  xp={progress.total_xp}
  streak={progress.streak_days}
/>

Bloco 2. Gráfico de evolução

Criar:

components/dashboard/ProgressChart.tsx

Usar:

recharts

Mostrar:

XP por dia

ou atividades concluídas por dia

Bloco 3. Progresso por matéria

Criar:

components/dashboard/SubjectProgressCard.tsx

Mostrar:

Matemática
████████░░ 80%
+120 XP

Português
████░░░░░░ 40%

Bloco 4. Consistência

Mostrar:

Streak atual

Exemplo:

5 dias seguidos

Bloco 5. Eduzinho AI Insights

Criar serviço:

services/eduzinhoInsightsService.ts

Função:

generateProgressInsight(progressData)


Exemplo de retorno:

"Samuel melhorou 22% em matemática esta semana!"

Integração com contexto existente

Atualizar:

contexts/StudentContext.tsx

Adicionar:

progressSummary
progressBySubject
progressTimeline

UX Requirements

Sempre mostrar:

estado carregando

estado vazio

estado com dados

Estado vazio exemplo

"Complete suas primeiras atividades para ver sua evolução!"

Gamificação adicional

Adicionar:

nível do aluno baseado no XP

Exemplo:

Level 3 Explorador

Performance Requirements

Tempo de carregamento:

< 500ms

Queries devem usar índices

Segurança

Aplicar RLS:

child_id in (
  select id from children where parent_id = auth.uid()
)

Arquivos a criar

components/dashboard/StudentProgressDashboard.tsx

components/dashboard/ProgressChart.tsx

components/dashboard/SubjectProgressCard.tsx

services/progressService.ts

services/eduzinhoInsightsService.ts

Arquivos a modificar

pages/reports.tsx

contexts/StudentContext.tsx

Critérios de Aceitação

Sistema deve:

Calcular progresso corretamente
Mostrar progresso geral
Mostrar progresso por matéria
Mostrar gráfico
Mostrar streak
Mostrar XP total
Mostrar insight do Eduzinho

Resultado final esperado

A tela deixa de ser um relatório passivo e passa a ser um sistema ativo de reforço pedagógico e emocional.