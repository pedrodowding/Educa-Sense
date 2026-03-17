# SPRINT 2 - Controle do responsável + aprovação de amigos (Educa Sense)

Você é um time sênior de produto e engenharia. Evolua o MVP de Amigos por Código (Sprint 1) adicionando controle do responsável (pai/mãe) e políticas de permissão, com foco em segurança, previsibilidade e boa UX.

## Objetivo

Garantir que o responsável possa:

1. Ligar/desligar o recurso de amigos por criança
2. Exigir aprovação do responsável para aceitar convites
3. Aprovar/recusar convites recebidos
4. Remover amizades existentes
5. Auditar ações básicas (quem aprovou, quando)

Sem chat. Sem busca pública. O fluxo segue “por código”.

---

## 1) Banco de dados

### 1.1 Alterações em `children`

Adicionar colunas:

* `friends_enabled` boolean not null default true
* `friends_parent_approval_required` boolean not null default false

Índices sugeridos:

* index em (parent_user_id, friends_enabled) se existir parent_user_id
* index em (parent_user_id, friends_parent_approval_required)

### 1.2 Alterações em `friend_requests`

Adicionar colunas:

* `requires_parent_approval` boolean not null default false

  * valor preenchido no momento de criação do convite com base na configuração do destinatário (to_child)
* `approved_by_parent_user_id` uuid null (FK auth.users se aplicável)
* `approved_at` timestamptz null

Ajuste de regra:

* status ainda é: pending, accepted, rejected, canceled
* quando `requires_parent_approval = true`, somente o responsável pode efetivar “accepted” via endpoint específico

### 1.3 Auditoria mínima

Criar tabela `friends_audit_log`:

* `id` uuid pk default gen_random_uuid()
* `child_id` uuid not null
* `actor_parent_user_id` uuid null
* `actor_child_id` uuid null
* `action` text not null check in (
  'toggle_friends_enabled',
  'toggle_parent_approval_required',
  'request_sent',
  'request_canceled',
  'request_rejected',
  'request_accepted_by_child',
  'request_accepted_by_parent',
  'friend_removed_by_parent'
  )
* `metadata` jsonb default '{}'::jsonb
* `created_at` timestamptz default now()

Índices:

* (child_id, created_at desc)
* (actor_parent_user_id, created_at desc)

---

## 2) Regras do Sprint 2

### 2.1 Envio de convite (A -> B)

Ao enviar convite por código:

* bloquear se `to_child.friends_enabled = false`
* setar `requires_parent_approval` igual a `to_child.friends_parent_approval_required`
* se `requires_parent_approval = true`:

  * criança B consegue ver o convite, mas não consegue aceitar diretamente
  * UI mostra “Aguardando aprovação do responsável”

### 2.2 Aceite de convite

Casos:

1. `requires_parent_approval = false`

   * criança B pode aceitar/rejeitar normalmente
2. `requires_parent_approval = true`

   * criança B pode apenas rejeitar (opcional) ou apenas ver
   * aceite só ocorre pelo responsável na área do responsável

### 2.3 Remoção de amizade

* apenas o responsável remove, a partir da lista de amigos do child
* remover amizade deve:

  * deletar linha em friendships
  * opcional: cancelar pendings antigos entre o par

---

## 3) RLS e permissões

### 3.1 Funções helper

Ter:

* `current_child_id()`
* `current_parent_user_id()` (auth.uid())

### 3.2 Policies

* children:

  * responsável pode SELECT/UPDATE seus children (friends_enabled e friends_parent_approval_required)

* friend_requests:

  * child pode SELECT convites que envolvam ele
  * child pode INSERT apenas como from_child_id = current_child_id
  * child pode UPDATE:

    * rejeitar quando to_child_id = current_child_id
    * cancelar quando from_child_id = current_child_id e status = pending
    * aceitar apenas se requires_parent_approval = false
  * parent pode UPDATE convites onde to_child pertence ao parent e requires_parent_approval = true (aceitar/rejeitar)

* friendships:

  * child pode SELECT apenas amizades que envolvam ele
  * parent pode DELETE amizades dos seus children

* friends_audit_log:

  * parent pode SELECT logs dos seus children
  * child não precisa ver logs no MVP

---

## 4) RPCs / Endpoints (preferir RPC SQL transacional)

### 4.1 rpc_parent_update_friends_settings(p_child_id uuid, p_enabled boolean, p_require_approval boolean)

* valida que o child pertence ao auth.uid()
* atualiza children
* escreve audit log (toggle_friends_enabled / toggle_parent_approval_required)

### 4.2 rpc_parent_list_pending_friend_requests(p_child_id uuid)

* lista convites recebidos com status pending
* inclui dados do remetente (perfil simples)

### 4.3 rpc_parent_respond_friend_request(p_request_id uuid, p_action text)

* valida que request.to_child pertence ao auth.uid()
* se p_action = 'accept':

  * set status accepted
  * set approved_by_parent_user_id = auth.uid()
  * set approved_at = now()
  * cria friendships (par ordenado)
  * escreve audit log request_accepted_by_parent
* se p_action = 'reject':

  * set status rejected + responded_at
  * escreve audit log request_rejected

### 4.4 rpc_parent_remove_friendship(p_child_id uuid, p_friend_child_id uuid)

* valida ownership
* remove friendship (par ordenado)
* escreve audit log friend_removed_by_parent

### 4.5 Atualizar RPC do Sprint 1

Atualizar `rpc_send_friend_request_by_code` para:

* bloquear se friends_enabled do destinatário for false
* setar requires_parent_approval conforme destinatário
* escrever audit log request_sent

---

## 5) UI do responsável

Criar rota/tela: `/#/parent/child/:childId/friends` (ou padrão do projeto)

### 5.1 Bloco 1 - Configurações

* Toggle 1: “Permitir amigos”
* Toggle 2: “Exigir minha aprovação para aceitar convites”
  Regras UX:
* se Toggle 1 desligado: desabilitar Toggle 2 e esconder convites
* salvar com feedback visual e estado loading

### 5.2 Bloco 2 - Convites pendentes

* Lista com: avatar + nome do remetente + data
* Ações: Aprovar | Recusar

### 5.3 Bloco 3 - Amigos atuais

* Lista com: avatar + nome
* Ação: Remover

---

## 6) UI da criança (ajustes)

Na tela de convites:

* Se convite requires_parent_approval = true:

  * exibir label “Aguardando aprovação do responsável”
  * esconder botão “Aceitar”
  * opcional: permitir “Recusar” para a criança (decidir e implementar)

Adicionar guardrails:

* Se friends_enabled = false:

  * esconder card de Amigos e rota /friends deve mostrar estado vazio “Recurso desativado pelo responsável”

---

## 7) Critérios de aceite (testáveis)

1. Pai desliga “Permitir amigos” e criança não consegue enviar nem receber convites
2. Pai liga “Exigir aprovação” e:

   * convites chegam como pending
   * criança não consegue aceitar
   * pai aprova e amizade aparece para ambos
3. Pai remove amizade e ambos deixam de ver a conexão
4. Audit log registra: toggles, aprovações e remoções
5. RLS impede pai ver/alterar children de outro usuário e impede criança mexer em approval quando exige pai

---

## 8) Entrega

PR com:

* migrations (alter tables + friends_audit_log)
* RLS policies atualizadas
* RPCs novas e atualização das RPCs antigas
* UI do responsável + ajustes na UI do aluno
* types e hooks correspondentes

Prioridade: backend e RLS primeiro, depois UI.
