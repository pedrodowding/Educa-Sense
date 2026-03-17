🚧 SPRINT 9.1 – ESTABILIZAÇÃO PÓS-AUDIT (FASE 1–9)

Você é um time sênior de Produto, UX e Engenharia responsável por estabilizar, endurecer e dar previsibilidade à plataforma Educa Sense, após a execução das Sprints 1 a 9.

Esta sprint não cria novas features, não altera modelos de IA e não muda fluxos principais.
O foco é confiabilidade, clareza e governança.

🎯 OBJETIVO DA SPRINT 9.1

Eliminar inconsistências residuais, ruídos de UX e riscos técnicos identificados após o Sprint Audit (1–9), garantindo que:

O social funcione de forma previsível e compreensível

O progresso diário seja idempotente e à prova de duplicação

Auditoria e logs não quebrem constraints

Recompensas sigam rigorosamente o controle parental

A experiência da criança nunca seja interrompida por erro técnico

🧩 ESCOPO DA SPRINT
1️⃣ INBOX SOCIAL – HARDENING (SEM VIRAR CHAT)
Problema

Mensagens sociais existem, mas:

Não há clareza total de leitura

Badge nem sempre reflete estado real

Histórico pode confundir expectativa de “chat”

Ajustes Obrigatórios
Backend

Garantir que mensagens sociais:

sejam classificadas corretamente (type = social_message)

sejam marcadas como lidas ao abrir o Inbox

Limitar histórico retornado:

máximo de 20 mensagens

ou últimos 7 dias (o que vier primeiro)

Frontend

Inbox:

Ao abrir → marcar mensagens como lidas

Badge desaparece corretamente

Empty state infantil:

“Nenhum recado novo por aqui 💌”

Não criar scroll infinito

Não permitir resposta em cadeia (continua sendo envio pontual)

🚫 Fora de escopo:

Chat em tempo real

Campo de texto livre

Histórico ilimitado

2️⃣ AUDITORIA – NORMALIZAÇÃO E CONSTRAINT SAFETY
Problema

O erro 23514 mostrou que ações novas quebram o friends_audit_log_action_check.

Ajustes Obrigatórios
Banco de Dados

Revisar e padronizar todos os valores possíveis de action:
Exemplos permitidos:

friend_request_sent

friend_request_accepted

social_message_sent

social_block_applied

reward_enabled

reward_disabled

Atualizar CHECK CONSTRAINT para refletir somente ações válidas

Garantir que nenhuma RPC insira valores fora da enumeração permitida

Retenção

Criar política simples:

manter logs por 90 dias

excluir automaticamente logs antigos (pode ser função preparada, não precisa cron ativo ainda)

3️⃣ PROGRESSO DIÁRIO – BLINDAGEM CONTRA AUTO-CONCLUSÃO
Problema

Suspeita de múltiplas conclusões automáticas da diária.

Ajustes Obrigatórios
Backend

Tornar idempotente toda conclusão diária:

Um registro por child_id + date

Se tentativa duplicada ocorrer:

ignorar silenciosamente

registrar log técnico (não visível ao aluno)

Revisar triggers ou RPCs que marcam conclusão automática

UX

Nenhuma mudança visual

Nenhuma mensagem de erro para a criança

Objetivo: impossível concluir duas vezes o mesmo dia

4️⃣ GOVERNANÇA DE RECOMPENSAS – VISIBILIDADE CONTROLADA
Regra de Ouro

Pais sempre veem todas as recompensas.
Crianças só veem o que o pai liberou.

Ajustes Obrigatórios
Configurações do Responsável

Garantir toggles independentes para:

Livro de Histórias

Artes Criativas (Criar História)

Hora do Jogo

Esses controles:

Sempre visíveis para os pais

Persistidos no banco

Auditados (reward_enabled / reward_disabled)

Interface da Criança

Recompensas somem completamente se desativadas

Não mostrar placeholder, lock ou teaser

A opção não aparece ao concluir a missão diária

5️⃣ PERFORMANCE LEVE (SEM PWA)

Ajustes permitidos:

Evitar reload de imagens ao navegar Home ↔ Amigos

Cache simples de avatar no browser

Skeleton consistente para evitar “piscar” de tela

🚫 Fora de escopo:

Service Worker

Offline mode

PWA install

✅ CRITÉRIOS DE ACEITE (OBRIGATÓRIOS)

Nenhum erro 23514 ocorre ao enviar mensagem

Inbox social funciona com badge correto e leitura clara

Diário não pode ser concluído duas vezes no mesmo dia

Logs de auditoria nunca violam constraint

Pais sempre veem recompensas; crianças só veem se liberadas

Nenhum erro técnico é exibido para a criança

npm run typecheck passa sem erros

🚫 FORA DE ESCOPO DA SPRINT 9.1

Alterações em modelos Gemini

Novas recompensas

Gamificação extra

Relatórios por email

Chat livre

Refatorações arquiteturais grandes

📦 ENTREGA ESPERADA

Migrations SQL (auditoria, idempotência, governança)

Ajustes em RPCs existentes

Hardening dos hooks sociais

Pequenos ajustes de UI (Inbox, Rewards visibility)

Log em action_logs/2026-02-XX-sprint9-1-stabilization.txt