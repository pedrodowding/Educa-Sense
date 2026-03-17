Sprint 9 Hotfix - Acesso às Recompensas e Livro (UI + Rotas)

Contexto
Hoje a rota /#/meu-album mostra apenas Personagens (3 itens) e não existe nenhuma forma de acessar:

1. Recompensas (3 recompensas do game)
2. Livro de Histórias (histórias salvas)

Objetivo
Adicionar acesso claro e funcional para Recompensas e Livro, reaproveitando a tela Meu Álbum (sem refatorar o sistema do game).

Entrega obrigatória

1. Tabs no topo da tela Meu Álbum:

* Tab 1: Personagens (default) -> mantém exatamente o comportamento atual
* Tab 2: Recompensas -> lista as 3 recompensas do game
* Tab 3: Livro -> lista as histórias salvas (cards com título, data, criança, botão "Abrir")

2. Rotas
   Manter /#/meu-album como hub.
   Opcional: criar rotas dedicadas para deep link (mas a UI principal deve funcionar sem elas):

* /#/recompensas
* /#/livro

3. Dados
   Conectar o Tab "Recompensas" ao storage/tabela já criada na Sprint 8 (não inventar estrutura nova).
   Conectar o Tab "Livro" ao storage/tabela já criada para histórias.
   Se não existir endpoint/selector pronto, criar um service mínimo (getRewardsByChildId, getStoriesByChildId) com mock fallback protegido por feature flag.

4. Estado vazio

* Recompensas vazias: "Nenhuma recompensa desbloqueada ainda. Complete a rotina para ganhar."
* Livro vazio: "Ainda não há histórias salvas. Conclua uma missão e gere sua primeira história."

5. UX

* Mostrar contador por tab (ex: Recompensas: 3, Livro: N)
* Permitir filtrar por criança (Samuel/Esther) se já existir esse contexto no app; se não existir, usar childId ativo atual.

Aceite

* Eu consigo acessar Recompensas e ver 3 itens
* Eu consigo acessar Livro e ver as histórias salvas
* Personagens continua igual ao que está hoje
