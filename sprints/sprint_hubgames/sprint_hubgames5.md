Implementar jogo "Cofre Mágico" dentro do Hub /#/hora-do-jogo/cofre-magico

Mecânica

* Senha secreta: 4 cores, 6 cores disponíveis, repetição permitida.
* 8 tentativas.
* Montar palpite clicando cores, preencher 4 slots.
* Confirmar palpite:

  * pino verde: cor certa na posição certa
  * pino amarelo: cor certa na posição errada
* Vitória: 4 verdes.
* Derrota: 8 tentativas e revela senha.

UI

* Header com timer global
* Linha ativa destacada, botão confirmar, botão limpar linha.
* Feedback de pinos organizado e legível no mobile.

Persistência mínima

* registrar resultado em activity_events (source='game_cofre') com win/lose e attemptsUsed e child_id
