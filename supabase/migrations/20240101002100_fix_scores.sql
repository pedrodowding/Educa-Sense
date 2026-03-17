-- FIX SCORES TYPE AND DATA
-- Altera o tipo da coluna score para permitir decimais e recalcula scores zerados

-- 1. Alterar coluna score para NUMERIC em exercises
ALTER TABLE public.exercises ALTER COLUMN score TYPE NUMERIC;

-- 2. Recalcular scores zerados ou nulos onde temos dados de acertos
UPDATE public.exercises
SET score = ROUND((correct_answers::numeric / NULLIF(total_questions, 0)::numeric) * 10, 1)
WHERE (score IS NULL OR score = 0)
  AND correct_answers IS NOT NULL 
  AND total_questions > 0;

-- 3. Definir como NULL scores de atividades que não são de avaliação (ex: Artes, Leitura sem quiz)
-- Isso evita que apareçam como "0.0" nos relatórios
UPDATE public.exercises
SET score = NULL
WHERE score = 0 
  AND (correct_answers IS NULL OR total_questions = 0);

-- 4. Garantir que activity_completions também tenha score correto (sincronia)
UPDATE public.activity_completions
SET score = ROUND((metadata->>'correct_answers')::numeric / NULLIF((metadata->>'total_questions')::numeric, 0) * 10, 1)
WHERE (score IS NULL OR score = 0)
  AND activity_type = 'quiz'
  AND metadata->>'correct_answers' IS NOT NULL
  AND (metadata->>'total_questions')::numeric > 0;

-- 5. Limpar zeros em activity_completions para atividades sem avaliação
UPDATE public.activity_completions
SET score = NULL
WHERE score = 0 
  AND (metadata->>'correct_answers' IS NULL OR (metadata->>'total_questions')::numeric = 0);

-- 6. Função helper para verificar scores recentes (Debugging)
CREATE OR REPLACE FUNCTION check_recent_scores(p_child_id UUID)
RETURNS TABLE (
    id UUID,
    subject TEXT,
    score NUMERIC,
    correct INTEGER,
    total INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    table_source TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.subject, e.score, e.correct_answers, e.total_questions, e.created_at, 'exercises' as table_source
    FROM public.exercises e
    WHERE e.child_id = p_child_id
    ORDER BY e.created_at DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;
