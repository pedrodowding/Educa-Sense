# Sprint 7.2 | Bugfix e Estabilização Social (Mensagens, Feed e Notificações)

Você é um time sênior de Engenharia e Produto. Execute uma sprint curta e objetiva para corrigir bugs que estão quebrando a jornada do aluno e o envio de mensagens rápidas no perfil do amigo.

## Contexto do problema (evidências)

No perfil do amigo (`/#/student/friends/:friendId`), ao tentar enviar mensagem rápida (“Boa!”, “Parabéns!”, etc.), a UI exibe “Erro de conexão. Tente novamente.” e o console mostra:

1. Erro SQL (42803):

* `"column ac.completed_at must appear in the GROUP BY clause or be used in an aggregate function"`
  Isso ocorre ao buscar “social updates” no hook `useSocialInteractions` (ou RPC associada), indicando query inválida com SELECT de coluna não agregada.

2. Erro de NOT NULL (23502):

* `null value in column "title" of relation "child_notifications" violates not-null constraint`
  Isso ocorre ao enviar mensagem rápida e tentar criar uma notificação sem preencher `title`.

3. Chamadas 400/404 em endpoints RPC no PostgREST:

* Consequência dos erros acima ou de RPC faltante/desalinhada, gerando falhas em cascata no frontend.

## Objetivo da Sprint 7.2

Corrigir totalmente os bugs e garantir que:

* A página do perfil do amigo carregue sem erros no console.
* Mensagens rápidas sejam enviadas com sucesso (toast de sucesso) e gerem notificação corretamente.
* O feed/updates sociais não quebre por SQL inválido.
* O app degrade de forma segura: se algo social falhar, não pode travar a Home nem o Plano do Dia.

---

# 1) Backend | Correções obrigatórias (Supabase)

## 1.1 Corrigir RPC/Query de “social updates” (erro 42803)

Localize a função RPC usada para buscar updates sociais do amigo (ex: `rpc_list_social_updates`, `rpc_get_friend_activity_feed`, ou similar).

Corrija a query para não selecionar colunas não agregadas sem GROUP BY.

Regras:

* Se o objetivo é retornar “últimas conquistas/atividades”, não use GROUP BY. Use ORDER BY + LIMIT.
* Se precisar agrupar, agregue corretamente: `MAX(completed_at)` ou inclua a coluna no `GROUP BY`.

Implementação recomendada (preferida: feed cronológico simples):

* Retornar linhas individuais, ordenadas por `completed_at DESC`, com `LIMIT 3`.

Exemplo de padrão correto:

* `SELECT ... FROM ... WHERE child_id = p_friend_id ORDER BY completed_at DESC LIMIT 3;`

Critério:

* Nenhum erro 42803 no console ao abrir o perfil do amigo.

## 1.2 Corrigir criação de `child_notifications` (erro 23502)

Em toda criação de notificação relacionada a mensagens rápidas, garantir preenchimento obrigatório:

* `title` TEXT NOT NULL
* `body` TEXT NOT NULL
* `type` válido

Ajuste na RPC `rpc_send_predefined_message` (ou função equivalente):

* Preencher `title` sempre (exemplo: `Mensagem de um amigo`)
* Preencher `body` com a frase enviada (“Boa!”, “Parabéns!”, etc.)
* Preencher `metadata` com `{ from_child_id, to_child_id, kind: "quick_message" }`

Critério:

* Enviar mensagem não pode gerar erro 23502.
* Registro deve aparecer em `child_notifications` do destinatário.

## 1.3 Padronizar tipos e eventos

Garanta que o `type` usado na notificação exista no check constraint (se houver).
Se precisar, adicione novo type para mensagens rápidas, por exemplo:

* `friend_quick_message_received`

Critério:

* Nenhuma violação de constraint por type inválido.

## 1.4 Garantir que todas RPCs usadas no frontend existam e estejam publicadas

* Verificar no banco se as funções existem.
* Garantir `GRANT EXECUTE` apropriado (anon/auth conforme arquitetura).
* Rodar `NOTIFY pgrst, 'reload schema';` ao final da migration.

Critério:

* Sem 404 “function not found” para RPCs esperadas.

---

# 2) Frontend | Hardening e UX (sem refatorar estrutura)

## 2.1 `useSocialInteractions` não pode quebrar a página

* Envolver fetch de social updates em try/catch
* Se falhar, retornar feed vazio e manter resto do perfil funcional

Critério:

* Perfil do amigo renderiza mesmo que updates sociais falhem.

## 2.2 Envio de mensagem rápida: estados e feedback

* Botões desabilitados durante envio
* Toast de sucesso: “Mensagem enviada 😊”
* Toast de erro: usar mensagem mapeada pelos códigos do backend, e fallback: “Não foi possível enviar agora”

Critério:

* UX consistente e sem falha silenciosa.

## 2.3 Logs úteis (sem poluir)

* Logar 1 linha no console apenas em modo dev, com código e mensagem.
* Evitar múltiplos retries em loop.

---

# 3) Testes manuais (checklist)

Executar e registrar resultados:

1. Abrir perfil de amigo:

* Console sem 42803/404/400 em cascata.

2. Enviar “Boa!”:

* Toast de sucesso
* Notificação criada no destinatário (listar no Supabase)

3. Enviar 6ª mensagem no dia:

* Bloqueio por limite, com mensagem amigável e código esperado.

4. Desativar `social_interactions_enabled` no destinatário:

* Backend bloqueia e UI mostra mensagem correta.

---

# 4) Entrega

* Migration: `20260205XXXX00_sprint7_2_bugfix_social.sql`
* Ajustes em RPCs (updates feed + send message notification)
* Ajustes no hook `useSocialInteractions`
* Log de ação em `action_logs/2026-02-05-sprint7-2-bugfix-social.txt`

---

# Critérios de aceite (objetivos e mensuráveis)

1. Zero erros 42803 e 23502 no console ao usar perfil do amigo.
2. Envio de mensagens rápidas funciona (sucesso + notificação persistida).
3. Página não quebra se qualquer endpoint social falhar (fallback seguro).
4. Nenhum 404 de RPCs usadas na UI (funções existem e schema recarregado).
