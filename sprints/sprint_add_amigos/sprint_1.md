# SPRINT 1 (MVP) - Amigos por Código (Child -> Child) | Educa Sense

Você é um time sênior de produto e engenharia. Implemente o MVP de "Amigos por Código" para perfis de criança, com foco em segurança e simplicidade.

## Objetivo do MVP
Permitir que uma criança adicione outra criança como amiga usando um "Código de Amigo", sem busca pública e sem chat.

## Regras do MVP
- Não existe busca por nome.
- Adição apenas por código.
- Sem mensagens.
- Estados do convite: pending, accepted, rejected, canceled.
- Uma amizade é bidirecional e única (não duplicar).
- Convites duplicados devem ser bloqueados.
- Uma criança só pode ver e gerenciar convites e amizades que envolvam ela.
- Feature flag: friends_enabled (true por padrão no dev, mas implementada).

---

# 1) BANCO DE DADOS (Supabase / Postgres)

## 1.1 Tabelas
Criar:
- child_friend_codes
- friend_requests
- friendships

### child_friend_codes
- child_id (uuid, PK, FK children.id)
- friend_code (text, unique, not null)
- code_version (int, default 1)
- updated_at (timestamptz, default now())

Regras:
- Cada child tem 1 código.
- friend_code deve ser curto e fácil de digitar (ex: 8 chars base32 sem caracteres ambíguos).
- Gerar código ao criar child ou no primeiro login do child.

### friend_requests
- id (uuid PK default gen_random_uuid())
- from_child_id (uuid FK children.id not null)
- to_child_id (uuid FK children.id not null)
- status (text check in ('pending','accepted','rejected','canceled') default 'pending')
- created_at (timestamptz default now())
- responded_at (timestamptz null)
- unique constraint: (from_child_id, to_child_id) WHERE status='pending' (evita spam duplicado)

Validações:
- impedir from_child_id = to_child_id

### friendships
- id (uuid PK default gen_random_uuid())
- child_a_id (uuid FK children.id not null)
- child_b_id (uuid FK children.id not null)
- created_at (timestamptz default now())

Regras:
- Armazenar sempre o par ordenado: child_a_id < child_b_id (para garantir unicidade)
- unique constraint: (child_a_id, child_b_id)
- impedir child_a_id = child_b_id

## 1.2 SQL Migration (criar tudo)
Crie uma migration única com:
- extensions necessárias (pgcrypto se precisar)
- tables + constraints + indexes
- triggers para updated_at se vocês usam padrão

Sugestão de índice:
- friend_requests(to_child_id, status, created_at)
- friend_requests(from_child_id, status, created_at)
- friendships(child_a_id)
- friendships(child_b_id)
- child_friend_codes(friend_code)

---

# 2) RLS (Row Level Security)

Assumir que existe uma tabela "children" com relação ao usuário responsável e que o login da criança funciona com um "child session" (mesmo que não seja auth padrão). Se for auth por usuário pai, usar política baseada em child_id permitido no JWT ou em tabela de vínculo.

## 2.1 Abordagem
Implementar uma função SQL helper:
- current_child_id() RETURNS uuid
Que lê do JWT claim (ex: request.jwt.claim.child_id) se existir.
Caso seu projeto não tenha isso, criar um fallback usando uma tabela child_sessions vinculada ao auth.uid().

As policies devem permitir:
- child_friend_codes: SELECT apenas do próprio child_id; UPDATE apenas do próprio child_id
- friend_requests: SELECT apenas onde from_child_id = current_child_id OR to_child_id = current_child_id
- friend_requests: INSERT apenas quando from_child_id = current_child_id
- friend_requests: UPDATE apenas quando to_child_id = current_child_id (aceitar/rejeitar) OU from_child_id = current_child_id (cancelar)
- friendships: SELECT apenas onde current_child_id está em child_a_id ou child_b_id
- friendships: INSERT apenas via função RPC segura (recomendado), não direto

Observação: se você preferir, bloquear INSERT/UPDATE diretos em friendships e só permitir via RPC.

---

# 3) RPCs / Edge Functions (backend seguro)

Criar 4 endpoints (RPC preferencial):

1) rpc_get_my_friend_code()
- retorna meu friend_code (cria se não existir)

2) rpc_send_friend_request_by_code(p_friend_code text)
- resolve to_child_id via child_friend_codes.friend_code
- valida:
  - friends_enabled
  - existe destino
  - destino != eu
  - não existe amizade já
  - não existe pending já
- cria friend_requests(status='pending')
- retorna status ok

3) rpc_respond_friend_request(p_request_id uuid, p_action text)
- p_action: 'accept' ou 'reject'
- valida que request.to_child_id = current_child_id
- se accept:
  - muda status para accepted + responded_at
  - cria friendships com par ordenado (a<b)
  - cancela outros pendings duplicados entre o mesmo par se existirem (opcional)
- se reject:
  - muda status para rejected + responded_at

4) rpc_cancel_friend_request(p_request_id uuid)
- valida que request.from_child_id = current_child_id
- só permite se status='pending'
- muda para canceled + responded_at

Tudo deve ser transacional.

---

# 4) FRONTEND (Student Mobile)

## 4.1 Nova área: Amigos
Adicionar na tela do aluno um card "Amigos" com:
- contador de amigos
- botão "Ver"

Criar rota /student/friends (ou drawer/modal dependendo do app), com 3 abas simples (tabs):
- Meus amigos
- Convites
- Adicionar

### Tab 1: Meus amigos
- lista de amigos (nome + avatar)
- estado vazio: "Você ainda não tem amigos. Adicione pelo código."

### Tab 2: Convites
- "Recebidos" (pending onde to_child_id = eu)
  - botões: Aceitar | Recusar
- "Enviados" (pending onde from_child_id = eu)
  - botão: Cancelar

### Tab 3: Adicionar
- exibir "Seu código" com botão copiar
- input: "Código do amigo"
- botão: "Enviar convite"
- mensagens de erro claras:
  - código inválido
  - já são amigos
  - convite já enviado
  - não pode adicionar você mesmo

## 4.2 Componentes sugeridos
- FriendsCard.tsx (card na home do aluno)
- FriendsScreen.tsx
- FriendsList.tsx
- FriendInvites.tsx
- AddFriendByCode.tsx

## 4.3 Data fetching
Criar hooks:
- useMyFriendCode()
- useFriends()
- useFriendRequests()

Usar supabase client para chamar RPCs.
Garantir loading states e optimistic UI em accept/reject/cancel.

---

# 5) MODELOS / TYPES (TypeScript)
Criar types:
- FriendRequest
- Friendship
- FriendProfile (child minimal: id, display_name, avatar_url)

Você vai precisar de uma view ou query que traga o "perfil do amigo".
Sugestão:
- Criar view v_my_friends_profiles que resolve o "outro child" na friendship e junta com children.

Exemplo de lógica:
- Se current_child_id = child_a_id então friend = child_b_id, senão friend = child_a_id.

---

# 6) UX Guardrails
- Limitar convites por dia (deixar preparado, mas pode ficar para Sprint 4). No MVP, ao menos bloquear duplicados.
- Sem chat.
- Sem busca.
- Sem exibir sobrenome completo se existir, usar apenas primeiro nome ou nome curto configurado.

---

# 7) Critérios de aceite (testáveis)
1) Criança A consegue ver seu código.
2) Criança A envia convite para B usando o código de B.
3) Criança B vê convite recebido.
4) Criança B aceita e vira amizade.
5) Ambas passam a ver a amizade na lista.
6) Convites duplicados pending são bloqueados.
7) Se já são amigos, não permite criar convite novo.
8) RLS impede que uma criança veja convites de terceiros.

---

# 8) Testes mínimos
- Unit test (se aplicável) das funções de ordenação do par (a<b)
- Teste de integração de RPC:
  - send -> accept -> friendship criada
  - send duplicado -> erro
  - accept por usuário errado -> erro

---

# 9) Entrega
Abra PR com:
- migration SQL
- policies RLS
- RPCs (SQL)
- UI + hooks + types
- view v_my_friends_profiles (ou query equivalente)
- pequenos ajustes na Home do aluno para incluir FriendsCard

Prioridade: backend seguro primeiro, depois UI.
