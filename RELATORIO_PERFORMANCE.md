# Relatório de Análise Técnica de Performance - EducaSense

## 1. Monitoramento e Coleta de Métricas (Simulação Local e Análise Estática)
- **Tamanho do Bundle Frontend**: A análise do build de produção (`npm run build`) revelou arquivos significativos:
  - `index-xxxx.js` (Bundle Principal): ~488 KB (gzip: ~143 KB)
  - `ReportsPage-xxxx.js`: ~349 KB (gzip: ~105 KB) devido a bibliotecas de gráficos (Recharts).
  - `aiModels-xxxx.js`: ~255 KB (gzip: ~50 KB) devido à inclusão do SDK `@google/genai` no client-side.
  - **Impacto**: Tempo de carregamento inicial (TBT - Total Blocking Time e LCP - Largest Contentful Paint) afetado em conexões móveis ou 3G.
- **Latência de Rede & Servidor**: As chamadas à API de Inteligência Artificial estão sendo feitas diretamente do cliente. Isso expõe a chave da API (risco de segurança) e aumenta o payload do cliente. A latência depende do dispositivo do cliente, em vez de servidores otimizados.

## 2. Análise de Banco de Dados (Supabase)
Após varredura completa das migrações SQL (`supabase/migrations`), foram identificadas **falhas críticas de indexação** que explicam a lentidão no acesso (Database Bottlenecks):

- **Falta de Índices em Foreign Keys Críticas**:
  - `children.guardian_id`: A política de segurança (RLS) `EXISTS (SELECT 1 FROM children WHERE children.id = exercises.child_id AND children.guardian_id = auth.uid())` realiza uma varredura completa (Seq Scan) na tabela `children` toda vez que a tabela `exercises` é consultada.
  - `exercises.child_id`: Não possui índice. Consultas ao histórico de atividades de uma criança demoram proporcionalmente ao tamanho total da tabela `exercises`.
- **Gargalo nas Políticas RLS**: A falta de índices combinada com subqueries em políticas RLS gera um produto cartesiano de checagens, degradando a performance de leitura exponencialmente à medida que a base cresce.

## 3. Configuração de Web Server, Cache e Assets (Vite & CDN)
- **Code Splitting Ausente para Libs Pesadas**: O `vite.config.ts` não possui configurações avançadas de `manualChunks`. O `recharts` e o SDK do Google Gemini poderiam ser separados ou carregados sob demanda.
- **Cache de Assets**: O Vercel (provedor atual) faz o cache de assets estáticos gerados pelo Vite por padrão, mas requisições pesadas no frontend anulam os benefícios se o JS for massivo.
- **Imagens**: Faltam indícios de otimização estrita de imagens em tempo de execução, especialmente para avatares e assets gerados dinamicamente pela IA.

## 4. Problemas Identificados (Matriz de Priorização)

| ID | Problema | Severidade | Impacto | Prioridade |
|---|---|---|---|---|
| 01 | Ausência de Índice em `children.guardian_id` | Crítica | Alta latência em todas as leituras de dependentes (exercícios, rotinas). | P0 (Imediata) |
| 02 | Ausência de Índice em `exercises.child_id` | Crítica | Lentidão na página de Relatórios e Histórico. | P0 (Imediata) |
| 03 | Chamadas do Gemini SDK no Client-Side | Alta | Tamanho excessivo do bundle (255KB) e falha de segurança (Chave Exposta). | P1 (Alta) |
| 04 | Bundle pesado de Gráficos (Recharts) | Média | Aumenta o tempo de carregamento da página de Relatórios. | P2 (Média) |

## 5. Plano de Ação

### Fase 1: Correção de Banco de Dados (Tempo Est.: 2 horas)
**Ação:** Criar uma nova migração no Supabase para adicionar os índices ausentes.
```sql
CREATE INDEX CONCURRENTLY idx_children_guardian_id ON public.children(guardian_id);
CREATE INDEX CONCURRENTLY idx_exercises_child_id ON public.exercises(child_id);
```
**Recursos:** Engenheiro de Banco de Dados / Backend.

### Fase 2: Otimização de Frontend e Vite (Tempo Est.: 4 horas)
**Ação:** Atualizar o `vite.config.ts` para usar `manualChunks` no rollupOptions, isolando `recharts` e `@google/genai` do bundle principal.
**Recursos:** Desenvolvedor Frontend.

### Fase 3: Refatoração Arquitetural de IA (Tempo Est.: 1-2 semanas)
**Ação:** Migrar as chamadas do `aiModels.ts` e `@google/genai` para **Supabase Edge Functions** ou Next.js API Routes (se migrado).
**Impacto:** Reduz o bundle em ~255KB, esconde a API Key do navegador e permite cache via Redis/CDN das respostas da IA.

## 6. Métricas de Sucesso
- **Banco de Dados**: Redução do tempo de resposta das queries de `exercises` e `children` de >500ms para <50ms.
- **Frontend**: Bundle principal reduzido para menos de 300KB.
- **Lighthouse Score**: Aumento do score de Performance para >90 no Mobile.
- **TTFB (Time to First Byte)**: Consistente abaixo de 200ms na plataforma.