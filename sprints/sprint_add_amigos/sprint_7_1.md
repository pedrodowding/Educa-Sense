# SPRINT 7.1 – Correção de Envio de Mensagens Rápidas (Perfil do Amigo)

Você é um time sênior de Produto e Engenharia. Execute uma sprint curta de **correção funcional**, focada exclusivamente em garantir que as **mensagens rápidas pré-definidas** no Perfil do Amigo sejam enviadas corretamente, com feedback claro para a criança.

⚠️ Regras absolutas:

* NÃO criar chat livre
* NÃO adicionar novos tipos de mensagem
* NÃO alterar regras de limite ou segurança
* NÃO expandir social
* Corrigir apenas o que já foi entregue na Sprint 6

---

## 🎯 Objetivo da Sprint 7.1

Garantir que:

1. Os botões de mensagens rápidas funcionem de ponta a ponta
2. A criança receba feedback imediato ao tocar em um botão
3. Falhas não silenciem a interação
4. O comportamento seja previsível, simples e seguro

---

## 1) Correção do Envio (Backend)

### 1.1 RPC de envio de mensagem

Validar e corrigir a RPC responsável pelo envio de mensagens rápidas (ex: `rpc_send_predefined_message`):

Checklist obrigatório:

* Verificar se `social_interactions_enabled = true` para ambos os lados
* Validar amizade ativa entre `from_child_id` e `to_child_id`
* Respeitar limite diário (já existente)
* Retornar resposta clara de sucesso (`ok: true`)

Se a RPC já existir, **não criar outra**. Apenas corrigir.

---

## 2) Correção do Hook (Frontend)

### 2.1 useSocialInteractions

Garantir que o hook:

* Exponha uma função clara:
  `sendQuickMessage(messageType)`
* Faça `await` correto da RPC
* Trate erros explicitamente (não silencioso)
* Retorne estado:

  * `isSending`
  * `error`

---

## 3) Correção da UI (Perfil do Amigo)

### 3.1 Botões de Mensagem

Para cada botão (“Boa!”, “Parabéns!”, etc.):

* Conectar diretamente à função `sendQuickMessage`
* Desabilitar botão durante envio
* Evitar múltiplos cliques rápidos

### 3.2 Feedback visual obrigatório

Após envio com sucesso:

* Mostrar toast leve ou microfeedback:

  > “Mensagem enviada 😊”

Em caso de erro:

* Mensagem simples:

  > “Não foi possível enviar agora”

Nunca falhar silenciosamente.

---

## 4) Garantias de UX Infantil

* Nenhum texto técnico
* Nenhum erro visível complexo
* Feedback sempre positivo ou neutro
* Tempo de resposta perceptível (< 500ms em média)

---

## 5) Segurança (não alterar regras)

Confirmar que:

* Não é possível enviar mensagem se não forem amigos
* Não é possível enviar se `social_interactions_enabled = false`
* Não é possível exceder limite diário

A UI deve refletir isso (ex: botões desativados).

---

## 6) Critérios de Aceite da Sprint 7.1

A Sprint 7.1 só é considerada concluída quando:

1. Tocar em “Boa!”, “Parabéns!”, etc. envia a mensagem
2. O amigo recebe a notificação correspondente
3. A criança vê feedback imediato
4. Nenhum erro ocorre silenciosamente
5. `npm run typecheck` passa sem erros
6. Nenhuma funcionalidade fora do escopo foi criada

---

## 🚫 Fora de escopo

* Chat
* Histórico de mensagens
* Notificações complexas
* Alterações em limites
* Social novo

Execute exatamente conforme descrito.
