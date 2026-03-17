# Relatório Técnico: Investigação de Falha na Entrega de Convites

**Data:** 03/02/2026
**Responsável:** Trae AI

## 1. Resumo Executivo
Foi solicitada uma investigação abrangente sobre falhas na entrega de convites após migração de banco de dados.
A análise revelou que **não existia um mecanismo explícito de envio de convites por e-mail** implementado no código personalizado (`schoolService` ou frontend), exceto pelo fluxo padrão de Auth do Supabase que não estava sendo invocado programaticamente para novos membros (Professores/Diretores).

O sistema de "Friend Requests" implementado recentemente (Sprint 1) é puramente interno (in-app) e não utiliza e-mail, portanto não foi a causa.
A falha percebida deve-se à ausência de uma função dedicada para disparar o convite (`inviteUserByEmail`) ao adicionar membros a uma escola.

## 2. Diagnóstico

### 2.1. Análise de Código e Schema
- **Friend Requests:** O sistema de amigos (Child-to-Child) usa `friend_requests` e RPCs, sem envio de e-mail. Funcionando conforme especificação (sem mensagens externas).
- **School Members:** O método `schoolService.addMember` realizava apenas um `INSERT` na tabela `school_members`. Isso assume que o usuário já existe e está autenticado, falhando silenciosamente se a intenção era convidar alguém novo para a plataforma via e-mail.
- **Edge Functions:** A função `create-student` gera códigos de acesso mas não envia e-mails.

### 2.2. Configuração de E-mail
- Não foram encontrados serviços de terceiros (SendGrid/Resend) configurados no código. O projeto depende do provedor SMTP padrão do Supabase Auth.
- O método `supabase.auth.admin.inviteUserByEmail` (necessário para convidar novos usuários) não estava sendo chamado em lugar nenhum.

## 3. Solução Implementada

Para resolver a "falha de entrega" (que na verdade era uma falha de implementação), foi criada uma infraestrutura completa de convites:

### 3.1. Edge Function `invite-user`
Criada em `supabase/functions/invite-user/index.ts`.
- **Funcionalidade:** Recebe e-mail, role e schoolId.
- **Ação:** Utiliza a API Admin do Supabase (`auth.admin.inviteUserByEmail`) para disparar o e-mail de convite oficial.
- **Redirecionamento:** Configurada para redirecionar o usuário para a página de definição de senha (`/#/auth/reset`) após o clique.
- **Segurança:** Valida se quem está convidando é um usuário autenticado.

### 3.2. Atualização no `schoolService`
- Adicionado método `inviteMember` que invoca a Edge Function segura.
- Isso permite que o frontend chame `schoolService.inviteMember(...)` para adicionar professores que ainda não têm conta.

### 3.3. Testes Automatizados
- Criado teste unitário em `services/tests/inviteMember.test.ts` utilizando Vitest.
- O teste valida que a função `invoke` do Supabase é chamada com os parâmetros corretos (e-mail, role, URL de redirecionamento).
- **Resultado:** Testes passaram com sucesso (100% pass).

## 4. Próximos Passos Recomendados

1.  **Integração no Frontend:** Atualizar a tela de gestão de equipe (ex: `DirectorTeachersPage`) para usar o novo método `inviteMember` em vez de apenas `addMember` (ou tentar `addMember` e, se falhar por usuário inexistente, oferecer o convite).
2.  **Monitoramento:** Acompanhar os logs da Edge Function no Dashboard do Supabase para verificar taxas de sucesso de envio SMTP.
3.  **Configuração SMTP:** Garantir que o SMTP customizado esteja configurado no Supabase para evitar limites de entrega do serviço gratuito.

## 5. Arquivos Alterados/Criados
- `supabase/functions/invite-user/index.ts` (Novo)
- `services/schoolService.ts` (Modificado)
- `services/tests/inviteMember.test.ts` (Novo)
