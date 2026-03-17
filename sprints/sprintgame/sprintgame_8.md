# SPRINT 8 – Recompensas Persistentes e Lúdicas com Controle Parental (Educa Sense)

Você é um time sênior de Produto, UX e Engenharia responsável por evoluir a plataforma **Educa Sense** com foco em experiência infantil, clareza narrativa, confiança do produto e controle parental.

Esta Sprint corrige uma **quebra de expectativa crítica** do produto e introduz uma **nova forma de recompensa lúdica**, sempre mediada pelos responsáveis e sem desviar do objetivo pedagógico central.

⚠️ Esta Sprint é dividida internamente em **8A (obrigatória)** e **8B (condicional)**.
A Sprint só é considerada concluída se a **8A estiver 100% entregue**.
A **8B só deve ser iniciada após a 8A estar funcional e validada**.

---

## 🎯 OBJETIVOS DA SPRINT

1. Corrigir a quebra de expectativa onde o sistema informa que a história foi “salva no livro”, mas não existe um Livro acessível.
2. Criar o **Livro de Histórias do Aluno** como um artefato emocional, persistente e visível.
3. Introduzir uma nova recompensa lúdica (“Hora do Jogo”), **controlada pelos pais**, sem criar hábito excessivo de tela.
4. Manter o escopo enxuto, sem gamificação agressiva, sem social novo e sem alterações em IA.

---

# 🅰️ SPRINT 8A – Livro de Histórias do Aluno (OBRIGATÓRIA)

## Problema a ser resolvido

Atualmente, ao finalizar uma história, o sistema afirma que ela foi “salva no livro do aluno”, porém:

* Não existe Livro acessível
* Não existe navegação
* Não existe artefato visível

Isso gera **frustração**, **quebra de confiança** e confusão para a criança.

---

## 📘 FEATURE: Livro de Histórias do Aluno

### Conceito

Criar o **Livro de Histórias**, um espaço emocional onde todas as histórias criadas pelo aluno ficam organizadas, visíveis e acessíveis ao longo do tempo.

O Livro é:

* pessoal
* persistente
* narrativo
* não editável

---

### Requisitos Funcionais

#### Entidade: Livro de Histórias

Associada a `child_id`.

Cada história finalizada deve:

* ser salva automaticamente no Livro
* aparecer como um “capítulo”

Campos mínimos por história:

* `id`
* `child_id`
* `titulo`
* `conteudo`
* `emocao` (se aplicável)
* `created_at`

Ordenação:

* Mais recente primeiro

---

### UX do Livro

#### Home do Aluno

* Criar um **card “Meu Livro”**
* Ícone visual infantil (📖 ou equivalente)
* CTA claro: “Abrir meu livro”

#### Tela do Livro

* Lista simples de histórias
* Cada história como um “capítulo”
* Visual limpo, sem scroll infinito

#### Ao finalizar uma história

* Microcelebração
* Mensagem obrigatória:

  > “Sua história agora faz parte do seu livro 📖”

---

### Fora de escopo explícito (8A)

* Exportação em PDF
* Compartilhamento externo
* Edição de histórias
* Impressão
* Socialização do conteúdo

---

# 🅱️ SPRINT 8B – Nova Recompensa: “Hora do Jogo” (CONDICIONAL)

⚠️ **Somente iniciar após a Sprint 8A estar concluída e validada.**

---

## 🎮 FEATURE: Hora do Jogo

### Conceito

Adicionar uma **terceira opção de recompensa** ao final da diária:

> um mini game curto, educativo e com **tempo estritamente limitado**, definido pelos pais.

Princípio central:

> **Recompensa, não hábito.**

---

### Configuração Parental

Na área do responsável, adicionar:

* Toggle: **Ativar / desativar “Hora do Jogo”**
* Definição de tempo máximo permitido:

  * 5 minutos
  * 10 minutos
  * 15 minutos
  * 20 minutos (máximo)

Se desativado:

* A opção não aparece para a criança.

---

### Comportamento do Jogo

* O jogo só é acessível:

  * Após concluir a diária (3/3)
  * Se estiver habilitado pelos pais
* Timer visível para a criança
* Encerramento automático ao fim do tempo
* Mensagem positiva de encerramento:

  > “Tempo encerrado! Você jogou muito bem 🎉”

---

### Tipo de Jogo (v1)

* Mini game simples
* Rodadas curtas
* Client-side (sem backend complexo)
* Sem ranking
* Sem competição
* Sem chat
* Sem progressão infinita

Pontuação:

* simples
* visual
* pode gerar moedas ou conquistas visuais leves

---

### Identidade Visual

Criar ícone/logo simples para “Hora do Jogo”.

Direção visual:

* Infantil
* Educativa
* Não gamer

Sugestões:

* 🎮 + ⏱️
* 🎓 + 🎲

---

## ✅ CRITÉRIOS DE ACEITE DA SPRINT 8

### Sprint 8A

1. A criança consegue acessar claramente o Livro de Histórias
2. Toda história finalizada aparece no Livro
3. A mensagem “salva no livro” corresponde à realidade do produto
4. O Livro é simples, visual e emocional

### Sprint 8B (se implementada)

5. “Hora do Jogo” aparece como terceira recompensa
6. O tempo de jogo respeita estritamente a configuração parental
7. O jogo encerra automaticamente
8. Nenhuma funcionalidade fora do escopo foi criada

---

## 🚫 FORA DE ESCOPO DA SPRINT 8 (ABSOLUTO)

* Rankings
* Competição entre crianças
* Jogos longos
* Chat ou social novo
* Alterações em modelos de IA
* Expansões de gamificação
* Refatorações estruturais grandes

---

Execute esta Sprint exatamente conforme descrito, respeitando a divisão 8A (obrigatória) e 8B (condicional).
