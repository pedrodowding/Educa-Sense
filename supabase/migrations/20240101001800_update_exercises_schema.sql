-- Adicionar colunas para persistência completa do conteúdo das atividades
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS content JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS pedagogical_objective TEXT;

-- Comentário: A coluna 'content' armazenará o objeto completo da atividade (perguntas, história, opções, etc.)
-- A coluna 'pedagogical_objective' armazenará o texto explicativo ou resumo da atividade.
