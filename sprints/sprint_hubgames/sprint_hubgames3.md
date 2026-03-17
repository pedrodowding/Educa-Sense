Implementar jogo "Neon Memory" (Genius) dentro do Hub /#/hora-do-jogo/memory

Mecânica

* Grid 2x2 com 4 botões coloridos estilo Neon (Verde, Vermelho, Amarelo, Azul).
* Sequência progressiva:
  * O jogo pisca uma sequência de cores.
  * A criança deve repetir a sequência tocando nos botões.
  * A cada rodada correta, adiciona mais um passo na sequência.
* Pressão de Tempo:
  * O jogador tem 5 segundos para fazer cada toque da sequência.
  * Se demorar muito, perde a rodada.
* Vitória/Derrota:
  * Errou a sequência ou estourou o tempo: Game Over (reinicia sequência).
  * Acertou: Feedback positivo e próxima rodada.

UI

* Header do hub com timer global.
* Botão central "Iniciar" para começar a sequência.
* Botões com efeito "Glow" intenso ao ativar.
* Sons distintos para cada cor (opcional, visual já resolve).
* Contador de Sequência Atual (Recorde).

Persistência mínima

* registrar resultado em activity_events (source='game_memory') com maxSequence=N e child_id
