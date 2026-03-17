Implementar jogo "Pega Certo!" (Missão Coleta) dentro do Hub /#/hora-do-jogo/coleta

Mecânica

* Rodada de 60s (ou usar tempo global como limite, mas manter ritmo com dificuldade progressiva)
* Itens (emojis) surgem e se movem pela tela (bolhas caindo ou flutuando)
* Missão no topo (escolhida aleatoriamente por rodada):

  * Vogais
  * Consoantes
  * Cores quentes (🔴🟠🟡)
  * Animais
  * Números pares
* Toque em item correto: +1 ponto, animação positiva
* Toque em item errado: shake e feedback suave, sem perder pontos
* Progressão:

  * com 40s restantes: aumenta spawn/velocidade
  * com 20s restantes: velocidade máxima e mais itens errados

UI

* Header do hub com timer global
* HUD do jogo: Pontos, missão, ritmo/dificuldade (opcional)
* Tela final ao fim da rodada ou ao fim do tempo global: pontos e mensagem positiva

Persistência mínima

* registrar resultado do jogo em activity_events (source='game_coleta') com score=pontos e child_id
