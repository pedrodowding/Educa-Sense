# SPRINT 5 – Estabilização Social, Correções Sprint 3 e Fechamento Sprint 4 (Educa Sense)

Você é um time sênior de produto e engenharia. Esta sprint é obrigatoriamente de **estabilidade e fechamento**. O objetivo é eliminar os erros de runtime que quebram a jornada do aluno, consolidar RPCs e garantir que os mecanismos da Sprint 4 estejam realmente completos e testados em produção.

⚠️ Regras:

* Não iniciar novas features sociais (sem chat, sem feed, sem busca).
* Prioridade máxima: **aluno conseguir usar o app sem erros no console**.
* Social não pode bloquear Plano de Hoje.
* Todas correções devem ser feitas com testes e critérios de aceite objetivos.

---

## 1) Correções obrigatórias da Sprint 3 (P0)

### 1.1 Corrigir RPCs de notificações para compatibilidade com PostgREST (PGRST202)

Problema observado:

* Console mostra `PGRST202` e `404 Not Found` ao chamar `rpc_list_notifications`.
* Isso quebra a jornada do aluno após login.

Objetivo:

* RPCs devem ser encontradas pelo PostgREST sempre.
* Assinatura e naming devem ser consistentes entre DB e frontend.

Ações:

1. Validar assinatura real das funções:

* `rpc_get_unread_notifications_count`
* `rpc_list_notifications`
* `rpc_mark_notification_read`

2. Padronizar contrato recomendável (seguro e estável):

* Remover parâmetro `p_child_id` das RPCs e usar `current_child_id()` no backend, para:

  * reduzir mismatch de assinatura
  * evitar bypass por envio de child_id externo
  * simplificar chamadas do frontend

3. Após ajuste, executar:

* `notify pgrst, 'reload schema';`

4. Atualizar `useNotifications.ts` para chamar:

* `rpc_get_unread_notifications_count` sem args
* `rpc_list_notifications` com `{ p_limit }` apenas
* `rpc_mark_notification_read` com `{ p_notification_id }`

Critério de aceite (P0):

* Nenhum erro PGRST202 ou 404 relacionado a notificações no console ao logar como aluno.
* Home do aluno carrega normalmente mesmo sem notificações.
* Badge funciona e some após leitura.

---

### 1.2 Guardrail no frontend: social nunca pode quebrar a Home

Mesmo se RPC indisponível temporariamente, o aluno deve seguir usando.

Ações:

* Em `useNotifications.ts` e em qualquer hook social:

  * se erro for de função inexistente / schema cache / 404
  * retornar estado seguro: `unreadCount = 0`, `notifications = []`
  * logar warning e não lançar exceção

Critério de aceite:

* Com backend quebrado propositalmente, a Home continua navegável e o Plano de Hoje funciona.

---

### 1.3 Validar criação real de notificações nas ações sociais

Ações:

* Garantir que as RPCs de amizade criem notificações conforme Sprint 3:

  * convite recebido
  * convite aceito
  * removido/bloqueado (se aplicável)

Critério de aceite:

* Ao enviar convite A→B, B vê notificação e badge.
* Ao aceitar, A recebe notificação e aparece toast.
* Lista de notificações renderiza corretamente.

---

## 2) Fechamento do que faltar na Sprint 4 (P1)

### 2.1 Cobertura de bloqueio completo: efeitos colaterais obrigatórios

Garantir que `rpc_block_friend` ou lógica equivalente realmente executa:

* remover amizade existente
* cancelar convites pendentes em ambos sentidos
* impedir convites futuros entre o par

Critério de aceite:

* Após bloquear, não existe registro ativo de amizade.
* Convites pendentes somem.
* Nova tentativa de convite retorna erro amigável.

---

### 2.2 Limites anti-spam: mensagens e testes

Ações:

* Garantir mensagens claras no frontend quando atingir:

  * 5 convites por dia
  * 20 por mês

* Adicionar testes (mínimo):

  * unit test de função de limite (se existir helper)
  * ou teste de integração com RPC simulando contagem

Critério de aceite:

* Ao atingir limite, retorno é previsível e UI mostra mensagem compreensível.
* A tentativa não cria `friend_requests`.

---

### 2.3 Auditoria consistente (friends_audit_log)

Ações:

* Garantir que logs são gravados para:

  * bloqueio
  * desbloqueio
  * tentativa de spam bloqueada
  * remoção de amizade por bloqueio

Critério de aceite:

* Consultando `friends_audit_log`, existem registros para cada ação acima, com child_id e timestamp.

---

## 3) Checklist final de regressão (P0)

Rodar fluxo completo com 2 crianças e 1 responsável:

1. A envia convite para B
2. B recebe notificação e badge
3. B aceita convite
4. A recebe notificação (e/ou toast)
5. B bloqueia A
6. amizade some, convites somem
7. A não consegue convidar B novamente
8. responsável vê bloqueios e consegue desbloquear
9. Após desbloquear, convite volta a funcionar

Critério de aceite:

* Zero erros no console relacionados a RPCs sociais
* Plano de Hoje não perde foco e permanece funcional em todas etapas

---

## 4) Entrega esperada

PR com:

* migration de ajuste das RPCs de notificações (se necessário)
* `notify pgrst, 'reload schema'` documentado no README de deploy
* updates em `useNotifications.ts` e guardrails
* ajustes/validações em RPCs de amizade/bloqueio/limites
* testes mínimos para limites e bloqueio
* action log da sprint

---

## 5) Fora de escopo (proibido nesta sprint)

* chat
* feed
* busca
* push notification
* desafios entre amigos
* ranking social

---

### Objetivo final da Sprint 5

Deixar o Social em estado "production safe":

* estável
* sem quebrar jornada do aluno
* com notificações funcionando
* com segurança Sprint 4 validada e completa
