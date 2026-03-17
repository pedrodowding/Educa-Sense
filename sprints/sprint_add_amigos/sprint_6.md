# SPRINT 6 – Interações Guiadas entre Amigos (Evolução de Produto)

Você é um time sênior de produto e engenharia. Implemente interações sociais **guiadas, seguras e de baixo risco** entre crianças no Educa Sense, evoluindo o recurso de Amigos sem introduzir chat livre, texto aberto ou qualquer dependência de IA.

⚠️ Regras absolutas:

* NÃO criar chat.
* NÃO permitir texto livre.
* NÃO mexer em Gemini, modelos de IA ou recompensas criativas.
* NÃO alterar lógica de convites, bloqueio ou limites já existentes.
* O “Plano de Hoje” deve continuar sendo o principal CTA da Home.

---

## 🎯 Objetivo da Sprint 6

Dar significado prático ao recurso de Amigos por meio de:

* interações simples,
* cooperação leve,
* reforço positivo,

sem aumentar risco, complexidade ou carga cognitiva.

---

## 1) Interações Guiadas (Reações)

### 1.1 Reações permitidas (fixas)

Implementar reações pré-definidas:

* 👍 Parabéns
* ⭐ Muito bem
* 🚀 Bora continuar

Características:

* Sem texto digitado
* Máx. 1 reação por evento
* Reação gera notificação simples para o amigo

---

### 1.2 Onde aplicar reações

Permitir reagir apenas a:

* Conclusão do Plano de Hoje
* Conquista desbloqueada (medalha)

Não permitir reação em:

* Perfil estático
* Lista de amigos

---

## 2) Mensagens Pré-definidas (sem chat)

### 2.1 Mensagens permitidas

Botões de mensagem rápida:

* “Boa!”
* “Parabéns!”
* “Bora jogar?”
* “Você consegue!”

Implementação:

* Cada envio gera um evento único
* Aparece para o amigo como notificação
* Não existe histórico estilo chat

---

### 2.2 Limites

* Máx. 5 mensagens pré-definidas por dia por criança
* Rate limit reutiliza infraestrutura existente

---

## 3) Desafios Cooperativos Simples

### 3.1 Tipos de desafios

Implementar desafios não competitivos:

* “Completar o Plano de Hoje”
* “Fazer 2 atividades hoje”

Características:

* Sem ranking
* Sem vencedor/perdedor
* Apenas status: pendente / concluído

---

### 3.2 Fluxo

1. Criança A envia desafio para amigo
2. Amigo aceita (1 clique)
3. Ambos veem status
4. Ao concluir, ambos recebem reforço positivo

---

## 4) Controle do Responsável

### 4.1 Novo Toggle

Adicionar na SettingsPage do responsável:

* “Permitir interações sociais entre amigos”

Quando OFF:

* Esconder reações
* Esconder mensagens pré-definidas
* Esconder desafios

---

## 5) UI / UX (ajustes obrigatórios)

### 5.1 Home do aluno

* Amigos nunca acima do “Plano de Hoje”
* Microcopy:
  “Amigos ajudam você a continuar aprendendo”

---

### 5.2 Página de Amigos

* Estados vazios educativos:
  “Convide amigos para aprender juntos”
* Feedback visual claro ao reagir/enviar mensagem

---

## 6) Auditoria e Logs

Registrar em `friends_audit_log`:

* reaction_sent
* predefined_message_sent
* challenge_sent
* challenge_completed

Sem logs de conteúdo sensível.

---

## 7) Métricas mínimas (internas)

Registrar para análise futura:

* Nº médio de reações por criança
* Nº de desafios enviados
* % crianças com amigos que concluem o Plano de Hoje

Não criar dashboard nesta sprint.

---

## 8) Critérios de Aceite (obrigatórios)

A Sprint 6 só é considerada concluída quando:

1. Criança consegue interagir sem escrever texto
2. Nenhuma nova superfície de risco é criada
3. Responsável consegue desligar tudo com 1 toggle
4. Plano de Hoje continua sendo o caminho principal
5. Nenhuma funcionalidade social quebra a Home
6. Não existem erros novos no console

---

## 9) Fora de Escopo (proibido)

* Chat livre
* Texto digitado
* IA / Gemini
* Feed social
* Ranking competitivo
* Comentários abertos

---

Implemente a Sprint 6 exatamente conforme descrito acima, respeitando o escopo e os critérios de aceite.
