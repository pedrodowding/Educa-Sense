Implementação: Hub de Jogos (4 jogos) com Tempo Global liberado pelos pais

Contexto
Teremos 4 jogos mobile-first:

1. Pega Certo! (Coleta por missão)
2. Neon Memory (Genius sequencial com pressão de tempo)
3. Caminho do Robô (programação por comandos)
4. Cofre Mágico (Mastermind)

Todos devem respeitar um TEMPO GLOBAL de uso liberado pelos pais (ex: 20 min). O tempo deve ser consumido independentemente do jogo escolhido. Trocar de jogo não reseta tempo.

Objetivo
Criar a arquitetura e UX de “Hora do Jogo” como um Hub com:

* Tela de seleção de jogos
* Sessão global com countdown (mm:ss)
* Bloqueio geral ao expirar
* Persistência da sessão para refresh
* Regras corretas de consumo: não consumir antes de clicar "Iniciar"

Regras de tempo (fonte de verdade)

1. O pai libera uma sessão: duration_minutes (ex: 20).
2. A sessão só inicia quando a criança clica "Iniciar Sessão de Jogos".
3. Enquanto sessão ativa:

   * countdown global visível em todas as telas de jogo
   * ao expirar: travar todos os jogos e mostrar "Tempo Encerrado" com CTA "Voltar"
4. Persistência:

   * sessionKey deve incluir childId + dayKey (YYYY-MM-DD no timezone do app)
   * armazenar started_at (timestamp) + duration_seconds + status ('pending'|'active'|'expired')
   * refresh deve retomar o tempo restante
5. Não consumir recompensa cedo:

   * abrir hub ou abrir card de jogo não consome
   * consumo ocorre no "Iniciar Sessão"
6. Se tentar iniciar e backend retornar already_used:

   * mostrar mensagem clara "Sessão de hoje já foi usada"
   * oferecer botão "Voltar"

Rotas e UX

* /#/hora-do-jogo => Hub (lista de jogos)
* Cards: jogo, descrição curta, habilidade desenvolvida, botão "Jogar"
* Ao escolher um jogo: navega para /#/hora-do-jogo/<slug>
* Header fixo em todas as telas de jogo:

  * botão voltar
  * nome do jogo
  * timer global mm:ss
  * pontos/nível do jogo atual (quando aplicável)

Back-end (preferência)
Criar RPC/Edge Function para sessão global:

* start_game_session(child_id, dayKey, duration_minutes) -> { success, started_at, duration_minutes } ou { success:false, error:'already_used' }
* get_active_game_session(child_id, dayKey) -> retorna sessão se existir
* end_game_session(child_id, dayKey) opcional
  Importante: separar "disponível" vs "usada". A sessão só vira usada quando iniciar.

Critérios de aceite

* Pai libera X minutos e criança só começa ao clicar Iniciar Sessão
* Timer diminui e é o mesmo em qualquer jogo
* Trocar de jogo não altera o tempo restante
* Refresh retoma com o tempo correto
* Ao expirar, qualquer jogo é bloqueado e mostra "Tempo Encerrado"
* Não existe consumo automático ao abrir tela
