# Configuração do Banco de Dados Supabase

Para que o EducaSense funcione corretamente com a persistência de dados, você precisa criar as tabelas no seu projeto Supabase.

## Instruções

1. Acesse o painel do seu projeto Supabase: [https://supabase.com/dashboard/project/oizoxqqdsszdqdyknwym](https://supabase.com/dashboard/project/oizoxqqdsszdqdyknwym)
2. Vá para a seção **SQL Editor** (ícone de terminal na barra lateral esquerda).
3. Clique em **New query**.
4. Copie todo o conteúdo do arquivo `supabase_schema.sql` que está na raiz deste projeto.
5. Cole no editor do Supabase e clique em **Run**.

## O que isso faz?

Este script cria as seguintes tabelas:
- **profiles**: Armazena dados dos usuários (Pais/Professores).
- **children**: Armazena os perfis dos alunos/filhos.
- **exercises**: Histórico de atividades realizadas.
- **daily_checkins**: Registros de humor e rotina.
- **behavior_goals**: Metas de comportamento.

Também configura as políticas de segurança (RLS) para garantir que cada usuário só acesse seus próprios dados.
