Você é um time sênior de Produto, UX e Engenharia responsável por evoluir a plataforma Educa Sense.

Quero que você implemente a **Sprint 8.1 (Hardening)** para estabilizar e deixar à prova de inconsistências o **Livro de Histórias** e a recompensa **Hora do Jogo**, sem refatorações grandes e sem alterar modelos de IA.

Contexto

* A Sprint 8 já implementou:

  * Tabela `child_stories`
  * `StoryBookPage` e card “Meu Livro” na Home do aluno
  * `GameRewardPage` (jogo da memória) com timer e encerramento automático
  * Config no painel do responsável para habilitar jogo e tempo (5, 10, 15, 20 min)
* Problemas a endereçar agora:

  1. RLS do `child_stories` foi implementado com acesso apenas do responsável, mas a criança precisa conseguir ver e salvar as próprias histórias no Livro.
  2. “Recompensa de jogo usada” está em `localStorage`, o que quebra em multi device, limpeza de cache e web vs app.
  3. O tempo do jogo precisa ser “estritamente limitado” e resiliente contra refresh e inconsistências básicas do client.

Objetivo da Sprint 8.1

* Garantir que:

  * A criança consiga **salvar** e **ler** suas próprias histórias no Livro.
  * O responsável consiga ler as histórias dos filhos sob sua guarda.
  * O status “jogo do dia utilizado” fique persistido no backend e seja consistente em qualquer device.
  * O timer do jogo seja encerrado corretamente mesmo com refresh e não dependa apenas de estado em memória.

Escopo permitido

1. Banco e RLS (Supabase)

* Ajustar `child_stories` com RLS correto para:

  * Criança (sessão do aluno): SELECT apenas onde `child_id` pertence ao próprio aluno
  * Criança: INSERT apenas para o próprio `child_id`
  * Responsável: SELECT de qualquer `child_id` que pertença ao responsável (via relação existente no schema, por exemplo `children.guardian_id = auth.uid()` ou tabela de vínculo equivalente)
* Entregue uma migration SQL nova para isso (não edite migrations antigas).
* Adicione índices mínimos se necessário (por exemplo, `child_id, created_at desc`) para leitura da lista.

2. Persistência de recompensa “Hora do Jogo”

* Criar uma tabela simples para recompensas diárias, por exemplo `child_daily_rewards` (ou nome equivalente), com:

  * `id` uuid pk
  * `child_id` uuid fk
  * `reward_date` date
  * `reward_type` text (ex: 'story', 'game')
  * `used_at` timestamptz not null
  * UNIQUE(`child_id`, `reward_date`, `reward_type`)
* RLS:

  * Criança e responsável podem ver apenas do seu contexto (mesma regra de ownership)
  * Criança pode inserir o próprio registro ao iniciar a recompensa
  * Responsável pode consultar para auditoria
* Criar RPCs pequenas e seguras:

  * `rpc_can_use_reward(p_child_id uuid, p_reward_type text)` retorna boolean e motivo
  * `rpc_mark_reward_used(p_child_id uuid, p_reward_type text)` faz upsert idempotente e retorna sucesso
  * As RPCs devem validar: permissões, toggle parental do jogo, e que não existe `used_at` no mesmo dia
* NÃO usar `localStorage` como fonte de verdade. Ele pode existir como cache opcional, mas o backend decide.

3. Robustez do timer do jogo

* Ao iniciar o jogo, persistir no backend:

  * `started_at` e `duration_minutes` (derivado da config parental)
* O frontend deve calcular `time_left` usando `server_started_at` e `duration_minutes`, não apenas contador local.
* Ao expirar, encerrar automaticamente e mostrar mensagem positiva.
* Ao dar refresh, o jogo deve continuar de onde parou (baseado no servidor) ou encerrar se expirou.

4. Frontend (mínimo necessário)

* Atualizar a lógica da `CreativeMissionPage` e `GameRewardPage` para:

  * checar `rpc_can_use_reward` antes de mostrar ou habilitar o CTA
  * ao clicar para jogar, chamar `rpc_mark_reward_used` (idempotente) e registrar `started_at`
  * remover dependência de `localStorage` para bloqueio do “jogo do dia”
* Atualizar `StoryBookPage` e `storyService.ts` se necessário, para funcionar com as novas RLS (sem gambiarra de service role no client).

Critérios de aceite (mensuráveis)

* Como aluno:

  * consigo ver o Livro com minhas histórias em até 1s em rede normal
  * consigo abrir uma história sem erro de permissão
  * ao gerar história, ela aparece no Livro imediatamente após salvar
* Como responsável:

  * consigo ver o Livro dos meus filhos (se existir feature no app ou via teste no Supabase)
* Jogo:

  * não consigo jogar mais de 1 vez por dia (mesmo trocando de device ou limpando cache)
  * ao dar refresh, o timer não reinicia
  * ao estourar o tempo, encerra automaticamente

Entregáveis

* 1 migration SQL completa (Sprint 8.1)
* Funções RPC descritas acima
* Ajustes no frontend com commits claros
* Um mini checklist de teste manual com 8 a 12 casos

Restrições

* Não refatorar estruturas grandes, não mexer em modelo de IA, não criar dashboards, não criar export PDF.
* Manter estilo do projeto e passar `npm run typecheck`.

Agora execute a Sprint 8.1 seguindo o que está acima, listando exatamente:

1. Arquivos criados/alterados (com paths)
2. SQL da migration
3. Nome e assinatura das RPCs
4. Checklist de testes manuais
