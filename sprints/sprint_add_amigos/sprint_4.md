# SPRINT 4 – Segurança, Limites e Moderação Social (Educa Sense)

Você é um time sênior de produto e engenharia. Dê maturidade ao Sistema de Amigos, garantindo segurança, previsibilidade e escalabilidade, sem adicionar chat, feed social ou busca pública.

Esta sprint NÃO cria novas interações sociais.
Ela protege e organiza as interações já existentes.

---

## Objetivo da Sprint 4

1. Evitar abuso de convites (spam).
2. Permitir bloqueio entre usuários.
3. Garantir controle total ao responsável.
4. Registrar e auditar comportamentos sensíveis.
5. Preparar o sistema para escalar com segurança.

---

## 1) Regras Globais

* Sem chat.
* Sem feed.
* Sem busca.
* Todas interações continuam por convite.
* Toda ação sensível deve ser auditável.

---

## 2) Banco de Dados

### 2.1 Tabela de Bloqueios

Criar `child_blocks`:

* id uuid pk
* blocker_child_id uuid fk children.id
* blocked_child_id uuid fk children.id
* reason text null
* created_at timestamptz default now()

Regras:

* unique (blocker_child_id, blocked_child_id)
* impedir auto-bloqueio

Efeitos:

* bloqueio impede novos convites
* bloqueio remove amizade existente
* bloqueio cancela convites pendentes

---

## 2.2 Limites de Convite (Anti-spam)

Implementar na RPC de envio:

* máximo 5 convites por dia
* máximo 20 convites por mês
* erro claro ao exceder:
  “Você atingiu o limite de convites por hoje”

---

## 3) Backend / RPCs

### 3.1 rpc_block_friend(p_blocked_child_id uuid)

* valida ownership
* remove amizade se existir
* cancela convites pendentes
* cria registro em child_blocks
* registra audit log:
  'friend_blocked_by_child'

---

### 3.2 Atualizações obrigatórias

Atualizar:

* rpc_send_friend_request_by_code

  * validar limites
  * validar bloqueios
* rpc_parent_remove_friendship

  * registrar auditoria adequada

---

## 4) RLS

* child_blocks:

  * SELECT/INSERT apenas pelo blocker
* friend_requests:

  * INSERT bloqueado se existir block
* friendships:

  * DELETE permitido quando bloqueio ocorre

---

## 5) UI do Aluno (ajustes mínimos)

### Perfil do Amigo

Adicionar ação:

* “Bloquear usuário”

Fluxo:

* modal de confirmação simples
* toast: “Usuário bloqueado”
* retorno para lista

---

## 6) UI do Responsável

Na SettingsPage:

* nova seção “Segurança Social”
* listar bloqueios feitos pelo filho
* permitir desbloqueio (opcional no MVP)

---

## 7) Auditoria

Registrar em friends_audit_log:

* bloqueio feito pela criança
* convite bloqueado por limite
* convite bloqueado por block

---

## 8) Critérios de Aceite

A Sprint 4 só é considerada concluída quando:

* convites abusivos são bloqueados
* bloqueio remove amizade
* bloqueio impede novos convites
* responsável tem visibilidade
* nenhuma nova complexidade social foi criada

---

## 9) Fora de Escopo

* Chat
* Feed
* Busca
* Push notification
* Mensagens livres

---

Implemente a Sprint 4 respeitando o escopo acima, sem refazer nada das Sprints 1–3.
