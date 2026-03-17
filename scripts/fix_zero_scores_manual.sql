-- FIX ZERO SCORES MANUAL SCRIPT
-- Execute este script no SQL Editor do Supabase para limpar dados históricos incorretos.

-- 1. Alterar coluna score para NUMERIC em exercises (caso ainda não seja)
-- Isso permite guardar notas decimais como 8.5
ALTER TABLE public.exercises ALTER COLUMN score TYPE NUMERIC;

-- 2. Recalcular scores onde temos dados de acertos mas score está 0 ou NULL
UPDATE public.exercises
SET score = ROUND((correct_answers::numeric / NULLIF(total_questions, 0)::numeric) * 10, 1)
WHERE (score IS NULL OR score = 0)
  AND correct_answers IS NOT NULL 
  AND total_questions > 0;

-- 3. Definir como NULL scores de atividades que NÃO são avaliação (score = 0 sem perguntas)
-- Isso corrige o problema de atividades como Leitura/Arte baixarem a média para 0.0
UPDATE public.exercises
SET score = NULL
WHERE score = 0 
  AND (correct_answers IS NULL OR total_questions = 0 OR total_questions IS NULL);

-- 4. Verificar resultados (Opcional)
-- SELECT subject, count(*), avg(score) FROM exercises GROUP BY subject;
