Implementar jogo "Caminho do Robô" dentro do Hub /#/hora-do-jogo/robo

Mecânica

* Tabuleiro 5x5.
* Robô (start) e Estrela (goal).
* Obstáculos (caixas).
* Criança monta fila de comandos via D-pad (setas). Limite 20 comandos.
* Botão Executar: robô anda passo a passo.
* Falha se bater em obstáculo ou sair do grid.
* Vitória se chegar na estrela.
* Níveis infinitos:

  * gerar mapa procedural com BFS garantindo solução
  * aumentar obstáculos com nível

UI

* Header com timer global
* Mostrar fila de comandos, botão limpar, executar, nível atual.

Persistência mínima

* registrar resultado por nível em activity_events (source='game_robo') com levelReached e child_id
