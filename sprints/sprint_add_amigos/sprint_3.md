# SPRINT 3 - Experiência Social Leve na Home do aluno + Notificações internas (Educa Sense)

Você é um time sênior de produto e engenharia. Evolua a experiência do aluno logado (tela /#/student) adicionando uma camada social leve, visível e motivacional ligada ao recurso de amigos (Sprint 1 e 2), sem aumentar complexidade nem desviar do foco principal: completar o Plano de hoje.

Contexto da tela atual (aluno):

* Saudação + métricas (dias, estrelas, nível, XP)
* Plano de hoje (0/3) com CTA "Começar"
* Card Amigos com contador
* Medalhas bloqueadas
* Estado “Sem missões pendentes!”

---

## Objetivo

1. Dar **significado visível** ao fato de ter amigos.
2. Manter o social leve, seguro e sem chat.
3. Tornar convites e eventos sociais perceptíveis sem exigir navegação extra.
4. Preparar base para interações futuras (Sprint 4+).

---

## 1) Regras do Sprint 3

* O caminho mais óbvio na Home continua sendo: Plano de hoje → Começar
* Social é complementar, não protagonista
* Sem feed, sem busca, sem chat
* Se friends_enabled=false: esconder card e rotas de amigos
* Se friends_parent_approval_required=true: convites continuam aceitos pela criança, com governança via auditoria

---

## 2) Banco de dados

### 2.1 child_notifications (mantido)

Sem alterações estruturais além do que já foi definido.

Adicionar **opcionalmente** o type:

* 'friend_activity' (evento social genérico)

---

## 3) RPCs / Backend

Mantém tudo que já foi definido, com um ajuste conceitual:

* Sempre que:

  * um convite é aceito
  * uma amizade é criada
* Criar notificação **e** retornar um flag simples:

  * `has_new_social_event = true`

Esse flag permite UX mais responsiva no frontend sem novo fetch.

---

## 4) UI do aluno – Home (AJUSTE)

### 4.1 Card “Amigos” (refinado)

Além do contador:

* Se houver evento social recente:

  * Microcopy abaixo do título:

    * “Você e Esther agora são amigos 🎉”
    * “Você tem um novo amigo!”
* Badge continua existindo para convites/notificações

Isso evita o “card morto” que você viu hoje.

---

## 5) UI de Amigos (aluno) – AJUSTADA

Rota: `/#/student/friends`

### 5.1 Seção A – Convites

Mantida exatamente como descrita (ok).

---

### 5.2 Seção B – Meus Amigos (AJUSTE IMPORTANTE)

Antes:

* Apenas visualizar

Agora:

* Cada amigo é **clicável**
* Ao clicar, abre `/#/student/friends/:friendId`

#### Friend Profile (novo, simples)

Exibir:

* Avatar
* Nome
* Nível
* XP
* Conquistas recentes (somente badges públicas)
* Texto fixo:

  * “Vocês estão aprendendo juntos!”

Sem ações destrutivas.
Sem chat.

---

### 5.3 Seção C – Adicionar amigo

Mantida sem alterações.

---

## 6) Notificações – UX refinada

### 6.1 Badge

Mantido.

### 6.2 Feedback imediato

Quando a criança:

* aceita convite
* tem convite aceito

Mostrar toast leve:

* “Novo amigo adicionado 🎉”

---

## 7) Compartilhar conquista (inalterado)

Continua como preparação apenas.

---

## 8) Critérios de aceite (atualizados)

1. Home mostra card Amigos com feedback social quando evento ocorre
2. Criança entende **por que** tem amigos
3. Lista de amigos não é passiva
4. Nenhuma distração do Plano de hoje
5. Nenhuma funcionalidade insegura adicionada
6. Experiência infantil clara e motivadora

---

## Conclusão clara

Respondendo objetivamente à sua dúvida anterior e conectando com agora:

* ❌ **Sprint 2 não tinha como objetivo gerar interação**
* ✅ **Sprint 3 precisa resolver exatamente essa sensação de “tem amigo mas não acontece nada”**
* O ajuste acima faz isso **sem inflar escopo** e sem refazer nada

Se quiser, no próximo passo eu:

* transformo essa Sprint 3 ajustada em **prompt direto para IDE**
* ou já desenho a **Sprint 4 (segurança + limites + desafios leves)**
