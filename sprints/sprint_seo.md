SPRINT: SEO + AI Discoverability do Educa Sense

Você é um engenheiro sênior Frontend + SEO técnico + AI Search Optimization.
Objetivo: garantir que o Educa Sense seja corretamente indexado pelo Google e compreendido por chatbots de IA (GPT, Gemini, Perplexity, Claude, etc.) como um produto educacional confiável.

Premissas obrigatórias
- Educa Sense é um app educacional infantil/familiar.
- Grande parte do app é logada, mas precisamos de conteúdo público indexável.
- O site usa SPA (React) e roda em produção com build otimizado.
- Nada de SEO superficial. Implementar base sólida.

--------------------------------
1) ESTRUTURA PÚBLICA INDEXÁVEL
--------------------------------

Criar (ou confirmar) rotas públicas e acessíveis SEM login:

- /
- /sobre
- /como-funciona
- /para-pais
- /para-alunos
- /seguranca-e-privacidade
- /contato

Cada rota deve:
- Renderizar conteúdo HTML real (não só skeleton)
- Ter <h1> único e semântico
- Ter texto explicativo suficiente (mín. ~300 palavras nas principais)

Evitar:
- Páginas vazias
- Conteúdo carregado apenas após interação
- Texto escondido em componentes colapsados

--------------------------------
2) METADATA SEO (HEAD)
--------------------------------

Implementar dinamicamente (ou estaticamente no index.html):

- <title> único por página
- <meta name="description"> claro e humano
- <meta name="robots" content="index, follow">
- <link rel="canonical">

Exemplo base:
<title>Educa Sense | Educação Infantil Inteligente com IA</title>
<meta name="description" content="Educa Sense é uma plataforma educacional inteligente para crianças e famílias, com atividades diárias, jogos educativos e acompanhamento parental." />

--------------------------------
3) SCHEMA.ORG (CRÍTICO PARA AI)
--------------------------------

Adicionar JSON-LD no <head> das páginas públicas.

Schemas obrigatórios:
- Organization
- SoftwareApplication
- EducationalOrganization (ou EducationalApplication)

Exemplo mínimo (ajustar dados reais):

{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Educa Sense",
  "applicationCategory": "EducationalApplication",
  "operatingSystem": "Web",
  "description": "Plataforma educacional inteligente para crianças, com atividades diárias, jogos educativos e acompanhamento parental.",
  "audience": {
    "@type": "Audience",
    "audienceType": "Pais e crianças"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Educa Sense"
  }
}

--------------------------------
4) SITEMAP.XML
--------------------------------

Criar sitemap.xml público e automático:

- /
- /sobre
- /como-funciona
- /para-pais
- /para-alunos
- /seguranca-e-privacidade
- /contato

Regras:
- lastmod dinâmico
- priority ajustada
- submit automático no Google Search Console

--------------------------------
5) ROBOTS.TXT
--------------------------------

Criar robots.txt explícito:

User-agent: *
Allow: /
Disallow: /login
Disallow: /student
Disallow: /parent
Disallow: /app

Sitemap: https://educasense.com/sitemap.xml

--------------------------------
6) PERFORMANCE E RENDERIZAÇÃO
--------------------------------

Garantir:
- Lighthouse SEO ≥ 90
- LCP < 2.5s
- CLS < 0.1
- Conteúdo principal visível sem JS pesado

Se SPA:
- garantir que o conteúdo principal esteja disponível após first paint
- evitar depender de auth ou API para texto institucional

--------------------------------
7) CONTEÚDO PARA CHATBOTS DE IA
--------------------------------

Criar uma página clara e textual (importante):

/sobre

Deve responder explicitamente:
- O que é o Educa Sense?
- Para quem é?
- Qual problema resolve?
- Como funciona?
- Diferencial do Educa Sense
- Segurança e privacidade infantil

Escrever em linguagem humana, explicativa, sem jargão técnico excessivo.

Chatbots de IA usam esse conteúdo como “fonte de verdade”.

--------------------------------
8) VERIFICAÇÕES FINAIS
--------------------------------

Checklist obrigatório:
- Google Search Console configurado
- Sitemap enviado
- Nenhuma rota pública retorna 401/403
- Nenhuma página indexável depende de login
- Nenhum conteúdo crítico apenas em canvas/JS isolado
- Testar via:
  - site:educasense.com no Google
  - Rich Results Test
  - Lighthouse SEO

--------------------------------
ENTREGA
--------------------------------

No final, gerar um resumo com:
- Rotas públicas criadas
- Metadados implementados
- Schemas adicionados
- Sitemap e robots
- Score SEO aproximado
- Próximos passos (ex: blog, conteúdo educativo)

IMPORTANTE:
Não implementar hacks de SEO.
Não usar keyword stuffing.
Não esconder conteúdo.
Priorizar clareza, confiança e rastreabilidade para humanos e IA.
