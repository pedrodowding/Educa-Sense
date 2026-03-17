🎯 PROMPT PARA IDE — SPRINT 7.3

Nome: SPRINT_7_3_HOME_SOCIAL_UX_HARDENING

Você é um time sênior de Produto, UX e Engenharia responsável por finalizar completamente a Sprint 7 (Home do Aluno).

Esta sprint NÃO cria novas features. O objetivo é fechar lacunas de UX, microcopy e robustez, garantindo que a Home do aluno nunca pareça vazia, quebrada ou confusa.

CONTEXTO OBRIGATÓRIO

A Home do Aluno já foi reformulada na Sprint 7 com foco narrativo, porém:

Alguns estados sociais dependem de dados reais e ficam “frios”

Estados vazios ainda usam linguagem neutra/técnica

O Social pode falhar e ainda impactar a experiência emocional

O card “Amigos” não explica claramente seu propósito em todos os cenários

Esta sprint fecha essas pendências.

OBJETIVO DA SPRINT 7.3

Garantir feedback emocional contínuo, mesmo sem dados reais

Eliminar qualquer percepção de erro técnico na Home do aluno

Refinar microcopy infantil em estados vazios

Completar 100% os critérios da Sprint 7

ESCOPO TÉCNICO (FAZER EXATAMENTE ISTO)
1️⃣ CARD “AMIGOS” — FALLBACK NARRATIVO (OBRIGATÓRIO)
Problema

Quando não existem eventos sociais recentes, o card fica frio ou genérico.

Ajuste

No componente FriendsCard (ou equivalente):

Se não houver eventos sociais recentes, exibir UMA mensagem narrativa fixa ou rotativa:

Exemplos válidos:

"Vocês estão aprendendo juntos! 🚀"

"Seu amigo também está jogando hoje 🎮"

"Que tal mandar uma mensagem para seu amigo?"

📌 Nunca deixar o card apenas com contador vazio ou texto técnico.

2️⃣ ESTADOS VAZIOS POSITIVOS (OBRIGATÓRIO)

Substituir qualquer microcopy neutra/técnica por mensagens positivas e narrativas.

Aplicar em:

Card Amigos

Card Conquistas

Seção inferior da Home

Exemplos de substituição:

❌ “Sem dados”

❌ “Nada encontrado”

❌ “Sem missões pendentes”

➡️ Substituir por:

✅ “Tudo certo por aqui 😊”

✅ “Você já fez tudo hoje! Que orgulho 👏”

✅ “Seu progresso está indo muito bem!”

3️⃣ BLINDAGEM TOTAL DA HOME CONTRA ERROS SOCIAIS (OBRIGATÓRIO)
Regra de ouro

A Home do aluno nunca pode exibir erro técnico.

Implementação

No nível da Home (StudentDashboardPage ou equivalente):

Se qualquer hook social falhar (useSocialInteractions, useFriends, etc):

Capturar erro

Retornar estado seguro (arrays vazios, contadores zerados)

Renderizar fallback narrativo

❌ Proibido:

Toast de erro

Texto “Erro de conexão”

Mensagens técnicas para a criança

4️⃣ CTA SOCIAL CONTEXTUAL (OBRIGATÓRIO)

No Card “Amigos”, adicionar CTA que muda conforme estado:

0 amigos → CTA: "Adicionar um amigo"

≥1 amigo + sem eventos → CTA: "Mandar mensagem"

Com eventos recentes → CTA: "Ver o que aconteceu"

📌 Não criar novos fluxos. Apenas ajustar label e intenção do botão existente.

5️⃣ REFINAMENTO FINAL DE MICROCOPY INFANTIL (OBRIGATÓRIO)

Revisar textos restantes da Home e ajustar para linguagem:

Infantil

Positiva

Narrativa

Emocionalmente clara

Evitar números frios quando possível.

FORA DE ESCOPO (NÃO FAZER)

🚫 Livro de Histórias
🚫 Jogos ou recompensas novas
🚫 Alterações em modelos de IA
🚫 Social avançado
🚫 Feed social novo
🚫 Sprint 8

CRITÉRIOS DE ACEITE (CHECKLIST FINAL)

A sprint só é considerada concluída se:

 A Home nunca parece vazia

 O card Amigos sempre explica seu propósito

 Nenhum erro técnico aparece para a criança

 Estados vazios têm microcopy positiva

 Nenhuma feature nova foi criada

 Missão de Hoje continua sendo o foco principal

VALIDAÇÃO FINAL

Executar npm run typecheck

Validar manualmente a Home:

com amigo

sem amigo

com falha simulada no social

ENTREGA ESPERADA

Ajustes apenas em frontend

Nenhuma migration nova

Registro em action_logs/2026-02-05-sprint7-3-home-ux-hardening.txt

Complemento para adicionar na Sprint 7.3 (Correções obrigatórias)
Contexto do bug (confirmado por console)

Envio de mensagens rápidas falha com erro SQL 42703:

column "body" of relation "child_notifications" does not exist

Causa raiz:

RPC rpc_send_predefined_message referencia colunas que não existem no schema atual do Supabase.

Impacto:

Botões de mensagem exibem “Erro de conexão. Tente novamente.” e a criança não consegue interagir.

Objetivo da Sprint 7.3 (hard fix)

Garantir que o envio de mensagens rápidas funcione de ponta a ponta, com consistência total entre:

Schema da tabela child_notifications

RPCs do social (principalmente rpc_send_predefined_message)

Frontend hook useSocialInteractions

Escopo obrigatório (não negociável)
1) Decisão única de contrato de notificação

Escolher e aplicar um padrão único para o texto da notificação:

Padrão recomendado (A):

title + content (ou message)
Sem body.

Regra:

Toda RPC deve inserir title e content.

Nenhuma referência a body pode existir no banco nem no frontend.

Se hoje a tabela tem outro nome para o campo de texto (ex: body ou message)

Padronizar via migration e alinhar RPCs.

2) Migration de alinhamento de schema (obrigatória)

Criar migration “sprint7_3_notifications_contract.sql” para:

Garantir que a tabela possui exatamente os campos usados pelas RPCs

Eliminar divergência entre content/body/message

Checklist mínimo da tabela child_notifications:

id uuid pk

child_id uuid not null

type text not null

title text not null

campo de texto principal (content/body/message) NOT NULL

metadata jsonb default '{}'::jsonb

is_read boolean default false

created_at timestamptz default now()

3) Correção completa da RPC rpc_send_predefined_message

Ajustar para:

Validar amizade ativa

Validar toggles de interações sociais do remetente e destinatário

Respeitar limite diário (5 por dia)

Inserir notificação com colunas reais do schema, preenchendo todos NOT NULL

Critério:

RPC não pode inserir null em campos NOT NULL

RPC não pode referenciar coluna inexistente

4) Regressão: garantir que o erro 404 de RPC não volte

Validar que as RPCs sociais estão no schema correto (public)

Se o pipeline exigir, incluir NOTIFY pgrst, 'reload schema'; na migration

5) Teste de contrato obrigatório (manual + dev)

Criar um arquivo de teste rápido ou instrução para rodar no SQL Editor:

Validar que rpc_send_predefined_message retorna sucesso

Validar que aparece registro em child_notifications

Validar que a UI mostra toast de sucesso e não exibe “Erro de conexão”

Critérios de aceite (mensuráveis)

Ao clicar em “Boa!” ou “Parabéns!” no Perfil do Amigo:

request para Supabase retorna 200

RPC retorna success=true

Um registro válido é criado em child_notifications com:

child_id do destinatário

title preenchido

campo de texto principal preenchido (content/body/message)

Nenhum erro no console de:

42703 (coluna inexistente)

23502 (NOT NULL)

404 (RPC não encontrada)

A UI não exibe mais “Erro de conexão. Tente novamente.”