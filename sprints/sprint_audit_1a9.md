# Estabilização Fase 1 a 9 – Educa Sense

Você é um time sênior de Produto, UX e Engenharia responsável por **consolidar, estabilizar e clarificar** a plataforma Educa Sense após as Sprints 1 a 9.

Este trabalho se chama **Estabilização Fase 1–9**.
Ele **não é uma nova sprint funcional** e **não adiciona novas features**.
O objetivo é corrigir confusões, fechar lacunas de UX, blindar regras de negócio e deixar o produto pronto para evoluir com segurança na Sprint 10.

---

## 🎯 OBJETIVO GERAL

Ao final desta estabilização, o produto deve estar:

* Claro e previsível para crianças
* Totalmente controlável pelos pais
* Consistente entre frontend e backend
* Sem features “existentes mas sem acesso”
* Sem estados ambíguos ou contraditórios
* Pronto para escalar sem regressões

---

## 🚧 ESCOPO GERAL (LEIA COM ATENÇÃO)

Você deve:

* Ajustar apenas o que já existe
* Consolidar contratos
* Melhorar clareza de UX
* Corrigir bugs reais identificados no Sprint Audit

Você **não deve**:

* Criar novas features
* Alterar modelos de IA
* Refatorar arquitetura
* Iniciar Sprint 10
* Adicionar chat livre
* Criar novas formas de gamificação

---

## 1️⃣ CONSOLIDAÇÃO DA COMUNICAÇÃO SOCIAL (Mensagens)

### Problema atual

* Mensagens rápidas existem
* Notificações existem
* Inbox Social existe
* Mas o fluxo ainda pode gerar confusão (mensagem vs notificação)

### Ajustes obrigatórios

* Toda mensagem predefinida enviada deve:

  * Gerar uma notificação do tipo `social_message`
  * Aparecer obrigatoriamente na Inbox Social (`/student/inbox`)
* O Card “Amigos” na Home do aluno:

  * Só exibe “Nova Mensagem” se existir mensagem não lida
  * CTA deve ser sempre **“Ler recados”**
  * Clique leva sempre para `/student/inbox`
* Eliminar qualquer microcopy ambígua (“Nova mensagem!” sem ação clara)

### Critério de aceite

* Criança recebe mensagem → em no máximo **2 cliques** consegue ler o conteúdo

---

## 2️⃣ UX DE FEATURES COM ACESSO CONFUSO

### 2.1 Mural da Escola (`/school/wall`)

* Se o responsável não estiver vinculado a nenhuma escola:

  * Mostrar empty state claro e explicativo

    > “Este mural é utilizado por escolas parceiras.”
  * CTA opcional: “Saiba mais” ou “Solicitar acesso”
* Nunca aparentar feature quebrada ou escondida

### 2.2 Modo Professor (`/teacher`)

* Se o usuário não tiver perfil de professor:

  * Mostrar onboarding simples:

    > “Você ainda não é um professor cadastrado”
  * Explicar em 1 parágrafo para que serve
* Evitar telas vazias ou rotas confusas

---

## 3️⃣ LIVRO DE HISTÓRIAS – ONBOARDING E CLAREZA

### Problema atual

* Livro funciona
* Crianças novas veem uma tela vazia

### Ajustes

* Se não houver histórias:

  * Exibir empty state ilustrado:

    > “Aqui vão ficar suas histórias 📖”
    > “Complete uma missão criativa para criar a primeira”
* Garantir que toda mensagem “Sua história foi salva no livro”:

  * Sempre corresponda a algo visível no Livro
* Não criar histórias falsas ou automáticas

---

## 4️⃣ HORA DO JOGO – CLAREZA E SEGURANÇA

### Ajustes obrigatórios

* Antes de iniciar o jogo:

  * Mostrar mensagem clara:

    > “Você pode jogar por X minutos”
* Durante o jogo:

  * Timer sempre visível
* Ao encerrar:

  * Mensagem positiva e conclusiva:

    > “Tempo encerrado. Parabéns por jogar com equilíbrio 🎉”
* Garantir que:

  * O jogo não reaparece no mesmo dia após uso
  * O estado vem sempre do backend
  * `localStorage` não é fonte de verdade

---

## 5️⃣ GOVERNANÇA DE RECOMPENSAS (PAIS x CRIANÇAS)

### Princípio central (regra-mãe)

> Todas as recompensas são **sempre visíveis e configuráveis para os pais**,
> mas **só aparecem para a criança quando explicitamente liberadas** pelo responsável.

### 5.1 Painel do Responsável

* Criar seção clara: **“Recompensas do Aluno”**
* Listar todas as recompensas existentes:

  * História Criativa
  * Hora do Jogo
  * Outras já existentes no sistema
* Para cada recompensa:

  * Toggle Ativar / Desativar
  * Configurações específicas (tempo, limites)
* Pais sempre veem todas as recompensas, independentemente do estado da criança

### 5.2 Experiência da Criança

* Criança só vê recompensas:

  * Ativas
  * Liberadas
  * Utilizáveis
* Recompensas desativadas:

  * Não aparecem
  * Não mostram cadeado
  * Não mencionam decisão dos pais
* Pode existir apenas texto neutro:

  > “Outras recompensas podem aparecer aqui 😊”

### 5.3 Backend

* Criar fonte única da verdade:

  * RPC ou endpoint que retorna recompensas ativas por `child_id`
* Todas as telas de recompensa devem depender desse retorno
* Acesso direto por URL deve ser bloqueado se recompensa estiver desativada

### Critério de aceite

* Pai controla tudo
* Criança nunca vê algo que não pode usar
* Nenhuma inconsistência entre UI e backend

---

## 6️⃣ AUDITORIA SOCIAL – HARDENING FINAL

### Ajustes

* Garantir que nenhuma ação social falhe se o audit log falhar
* Auditoria deve ser:

  * Best-effort
  * Nunca bloqueante
* Padronizar nomes de `action` usadas nas RPCs sociais
* Documentar em SQL (comentário) que auditoria não pode quebrar UX

---

## 7️⃣ BUG CRÍTICO – AUTO-CONCLUSÃO DE ATIVIDADES

### Ajuste solicitado

* Usar o botão de Reset Diário (Sprint 9) para:

  * Reproduzir o bug
  * Identificar causa real:

    * trigger
    * RPC duplicada
    * lógica de cálculo
* Entregar:

  * Hipótese clara
  * Evidência (log ou comentário)
  * Fix **somente se a causa for confirmada**

Não aplicar fix especulativo.

---

## 📦 ENTREGÁVEIS ESPERADOS

1. Lista clara de arquivos alterados
2. Migrations SQL (se houver), com propósito descrito
3. Ajustes de frontend focados em clareza
4. Checklist manual de validação (10–15 itens)
5. Resumo final:

   * O que ficou mais claro
   * O que ficou mais seguro
   * O que ainda NÃO deve ser escalado

---

## ✅ DEFINIÇÃO DE SUCESSO

Ao final da Estabilização Fase 1–9:

* Criança entende o que pode fazer em cada tela
* Pai entende exatamente o que controla
* Não existem features “fantasmas”
* Não existem estados ambíguos
* O produto está pronto para planejar a Sprint 10 com confiança

Execute exatamente o que está acima.
