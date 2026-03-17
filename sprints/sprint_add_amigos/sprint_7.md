# SPRINT 7 – Home do Aluno: Clareza, Motivação e Encantamento Diário (Educa Sense)

Você é um time sênior de produto e engenharia. Evolua a **Home do aluno (login por código)** para torná-la mais clara, motivadora e emocionalmente envolvente, sem adicionar novas funcionalidades complexas, sem IA nova e sem alterar regras de negócio existentes.

⚠️ Regras absolutas:

* NÃO mexer em convites, amigos, bloqueios ou permissões.
* NÃO criar rankings, feed ou chat.
* NÃO adicionar dependências de IA (Gemini, prompts, etc.).
* NÃO retirar o foco do “Plano de Hoje”.
* Alterações devem ser majoritariamente de **UI + UX + microcopy**, com lógica simples derivada de dados já existentes.

---

## 🎯 Objetivo da Sprint 7

Fazer com que a criança:

1. Entenda **o que precisa fazer hoje** em até 5 segundos.
2. Saiba **o que vai ganhar** ao completar o Plano.
3. Sinta progresso, mesmo quando ainda não concluiu tudo.
4. Termine o dia com sensação de conquista, não de checklist.

---

## 1) Narrativa Diária do Plano

### 1.1 Bloco “Hoje você vai…”

Adicionar um bloco leve, integrado ao Plano de Hoje, com texto dinâmico.

Exemplo:

> 🎯 **Hoje você vai:**
> • Fazer seu check-in
> • Completar uma missão
> • Ganhar +1 estrela ⭐

Regras:

* Texto derivado das etapas do Plano do Dia.
* Sem IA.
* Atualiza conforme progresso (ex: 1/3 concluído).

Critério de aceite:

* Criança entende o plano sem ler a lista técnica de tarefas.

---

## 2) Progresso Simplificado (menos números, mais intenção)

### 2.1 Barra única de progresso

Unificar XP, nível e meta em **1 mensagem visual**:

Exemplos:

* “Falta 1 atividade para subir de nível!”
* “Você está quase lá! 🚀”

Regras:

* Mostrar apenas o próximo objetivo.
* Evitar múltiplos números simultâneos.

---

## 3) Medalhas com Proximidade de Conquista

### 3.1 Destacar apenas medalhas “quase desbloqueadas”

Modificar a seção de medalhas para mostrar:

* no máximo 1 ou 2 medalhas
* sempre as mais próximas de liberar

Exemplo:

> ⭐ **Estrela da Leitura**
> Falta 1 atividade para desbloquear!

Não mostrar todas as medalhas bloqueadas na Home.

---

## 4) Social com Microfeedback (sem feed)

### 4.1 Card Amigos (ajuste leve)

Adicionar uma linha de microfeedback social quando existir atividade recente.

Exemplos:

* “Seu amigo já jogou hoje 🚀”
* “Esther completou a missão!”

Regras:

* Mostrar apenas 1 evento
* Se não houver evento, manter apenas contador (“1 amigo”)

---

## 5) Linguagem Infantil e Emocional

### 5.1 Revisão de microcopy

Substituir textos técnicos ou frios por mensagens mais infantis.

Exemplos:

* “Sem missões pendentes!” →
  “Você mandou bem hoje! 🎉”
* “Plano de hoje” →
  “Missão de hoje”

Manter consistência de tom em toda a Home.

---

## 6) Estado Pós-Conclusão (3/3)

### 6.1 CTA claro de recompensa

Quando o Plano de Hoje estiver completo:

Exibir bloco destacado:

> 🎁 **Recompensa disponível!**
> [Criar minha história] ou [Ver conquista]

Regras:

* Só aparece após 3/3
* Não competir visualmente com o CTA “Começar” quando ainda não concluído

---

## 7) Organização Visual da Home

### 7.1 Ordem dos blocos (obrigatória)

1. Saudação + avatar
2. Progresso resumido
3. Missão de Hoje / Plano de Hoje
4. CTA principal (Começar)
5. Amigos (microfeedback)
6. Medalhas (proximidade)
7. Estado final do dia (se aplicável)

Evitar scroll excessivo.

---

## 8) Critérios de Aceite (Sprint 7)

A Sprint 7 só é considerada concluída quando:

1. Criança entende o que fazer hoje rapidamente
2. Home não fica mais carregada do que antes
3. Plano de Hoje continua sendo o CTA principal
4. Textos são mais infantis e motivadores
5. Medalhas deixam de parecer distantes
6. Social aparece como apoio, não distração
7. Nenhuma nova dependência técnica foi adicionada

---

## 9) Fora de Escopo (proibido)

* IA nova
* Mudança em Gemini
* Rankings
* Chat
* Feed social
* Configurações do responsável
* Métricas avançadas ou dashboards

---

Implemente a Sprint 7 exatamente conforme descrito acima, priorizando clareza, motivação e simplicidade.
