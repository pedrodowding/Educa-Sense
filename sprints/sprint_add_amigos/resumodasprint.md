Sprint 0 (base) | Preparar terreno e regras do jogo

Objetivo: criar fundação técnica e decisões de produto para não refazer depois.

Entregas

Definir o modelo de identidade da criança: child_id, nome exibido, avatar, idade/faixa etária (se vocês usam), e “perfil público” (sim/não).

Definir política de amizade: só por código/convite ou também por busca.

Definir controles do responsável: “permitir amigos” (on/off), “aprovar convites” (on/off).

Logs mínimos: auditoria de convites enviados/aceitos.

Critérios de aceite

Documento curto de decisões (1 página) + checklist de privacidade.

Feature flags: friends_enabled, friends_requires_parent_approval.

Sprint 1 | MVP de Amigos por Código (o mais seguro e simples)

Objetivo: permitir adicionar amigos sem expor busca pública.

Entregas

Banco:

friend_requests (from_child_id, to_child_id, status, created_at)

friendships (child_a_id, child_b_id, created_at)

Garantir unicidade (não duplicar amizade).

UI (aluno):

Nova área “Amigos” com:

“Adicionar amigo”

campo “Código do amigo”

lista de amigos (nome + avatar)

Geração de código de amigo:

Cada criança tem um “Código de Amigo” (rotacionável ou fixo com opção de regenerar).

Estados e mensagens:

convite enviado, convite recebido, aceito, recusado, já são amigos.

Critérios de aceite (mensuráveis)

Criar amizade por código em até 3 passos.

0 duplicidades de amizade (validação em DB + UI).

Latência aceitável: listagem de amigos em até 1s em rede normal.

Sprint 2 | Controle do Responsável e Permissões

Objetivo: colocar o pai no controle e evitar conexões indevidas.

Entregas

Tela do responsável:

Toggle “Permitir amigos”

Toggle “Exigir aprovação para aceitar convites”

Lista de solicitações pendentes para aprovar/recusar

Lista de amigos atuais com opção “Remover amigo”

Regras:

Se “exigir aprovação” ativo, criança só consegue aceitar convite após aprovação.

Bloqueio total se “permitir amigos” desligado.

Critérios de aceite

Pai consegue aprovar/recusar em 1 tela.

Criança não consegue burlar (testes de permissão no backend).

Sprint 3 | Experiência Social Leve na Home do Aluno

Objetivo: dar mais opções sem perder simplicidade.

Entregas

Ajustes na home do aluno (sem poluir):

Card “Amigos” (contador + CTA “Ver amigos”)

Card “Conquistas” (medalhas e progresso, mesmo que bloqueadas)

Card “Meu Progresso” (XP, nível, meta do dia)

Microinterações:

Quando completa meta: opção “Compartilhar conquista com amigos” (somente para amigos).

Notificações internas simples:

“Você recebeu um convite”

“Seu amigo completou a missão” (opcional, com toggle do pai depois)

Critérios de aceite

A home continua com no máximo 3 a 5 cards principais.

Cliques para iniciar “Plano de hoje” continuam sendo o caminho mais óbvio.

Sprint 4 | Segurança, Moderação e Anti abuso

Objetivo: blindar o sistema.

Entregas

Rate limit:

limite de convites por dia por criança

Bloqueio/denúncia:

“Bloquear usuário” (remove amizade e impede novos convites)

Auditoria e painel interno (simples):

lista de convites, bloqueios e volume por dia

Políticas:

Nenhum chat livre entre crianças neste momento

Se houver mensagens no futuro, só com mensagens pré definidas (ver Sprint 5 opcional)

Critérios de aceite

Convites abusivos bloqueados por limite.

Bloqueio impede novo convite imediatamente.

Sprint 5 (opcional) | Interações guiadas entre amigos

Objetivo: social com baixo risco.

Entregas (opções)

Reações prontas (emoji limitado) em conquistas do amigo.

Mensagens pré definidas:

“Boa”, “Parabéns”, “Bora jogar”, “Você consegue”

Desafios entre amigos:

“Complete 3 atividades hoje” (sem competição agressiva, só coop)

Critérios de aceite

0 texto livre.

Pai consegue desligar “interações sociais”.

Métricas para acompanhar desde o Sprint 1

% crianças com pelo menos 1 amigo em 7 dias

Taxa de conversão: convite enviado -> aceito

Convites por criança por dia (monitorar abuso)

Retenção D1/D7 para quem tem amigos vs quem não tem

Conclusão do “Plano de hoje” antes e depois do card de Amigos (não pode piorar)