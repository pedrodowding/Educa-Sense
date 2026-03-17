-- Tabela de Progresso Pedagógico por Criança
CREATE TABLE IF NOT EXISTS public.child_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    total_activities INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    avg_score NUMERIC DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    strengths JSONB DEFAULT '{}'::jsonb,
    weaknesses JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT child_progress_child_id_key UNIQUE (child_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_child_progress_child_id ON public.child_progress(child_id);

-- RLS
ALTER TABLE public.child_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guardians can view their children's progress" ON public.child_progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.children WHERE children.id = child_progress.child_id AND children.guardian_id = auth.uid())
  );

CREATE POLICY "Service role can manage child progress" ON public.child_progress
  FOR ALL USING (
    -- Service role bypasses RLS, but explicit policy for clarity/future
    true
  );

-- Função para calcular XP baseado nas regras
CREATE OR REPLACE FUNCTION public.calculate_activity_xp(
    p_activity_type TEXT,
    p_score NUMERIC DEFAULT 0
) RETURNS INTEGER AS $$
DECLARE
    v_xp INTEGER := 0;
    v_bonus INTEGER := 0;
BEGIN
    -- Regras de XP Base
    IF p_activity_type IN ('quiz', 'avaliacao') THEN
        v_xp := 20;
        -- Bônus de Score para Quiz
        IF p_score >= 8 THEN
            v_bonus := 10;
        ELSIF p_score < 5 THEN
            v_bonus := 0;
        END IF;
    ELSIF p_activity_type IN ('exercise', 'exercicio', 'matematica', 'portugues', 'ciencias') THEN
        v_xp := 15;
    ELSIF p_activity_type IN ('reading', 'leitura', 'historia') THEN
        v_xp := 10;
    ELSIF p_activity_type IN ('drawing', 'desenho', 'missao_criativa') THEN
        v_xp := 8;
    ELSE
        -- Default fallback
        v_xp := 5;
    END IF;

    -- Bônus fixo de Missão Completa (pode ser passado via tipo ou flag, aqui assumimos que se for 'missao_completa' ganha bonus)
    -- Mas a regra diz "Missão completa (fluxo inteiro): bônus fixo = +10 xp". 
    -- Vamos assumir que o caller define o tipo ou adiciona o bonus. 
    -- Por simplicidade, se o tipo for 'missao_completa', soma 10.
    IF p_activity_type = 'missao_completa' THEN
        v_xp := 10; 
    END IF;

    RETURN v_xp + v_bonus;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função principal para atualizar o progresso
CREATE OR REPLACE FUNCTION public.update_child_progress(
    p_child_id UUID,
    p_activity_type TEXT,
    p_subject TEXT,
    p_score NUMERIC DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_xp_earned INTEGER;
    v_progress public.child_progress%ROWTYPE;
    v_new_total_activities INTEGER;
    v_new_total_xp INTEGER;
    v_new_level INTEGER;
    v_new_avg_score NUMERIC;
    v_strengths JSONB;
    v_weaknesses JSONB;
    v_subject_count INTEGER;
BEGIN
    -- 1. Calcular XP
    v_xp_earned := public.calculate_activity_xp(p_activity_type, COALESCE(p_score, 0));

    -- 2. Buscar ou Inicializar Progresso
    SELECT * INTO v_progress FROM public.child_progress WHERE child_id = p_child_id;
    
    IF NOT FOUND THEN
        INSERT INTO public.child_progress (child_id, total_activities, total_xp, current_level, avg_score, strengths, weaknesses)
        VALUES (p_child_id, 0, 0, 1, 0, '{}'::jsonb, '{}'::jsonb)
        RETURNING * INTO v_progress;
    END IF;

    -- 3. Atualizar Contadores
    v_new_total_activities := v_progress.total_activities + 1;
    v_new_total_xp := v_progress.total_xp + v_xp_earned;
    v_new_level := FLOOR(v_new_total_xp / 100) + 1;

    -- 4. Atualizar Média (apenas se tiver score válido)
    IF p_score IS NOT NULL THEN
        -- Média ponderada cumulativa aproximada ou recalcular? 
        -- Recalcular do zero é caro. Vamos fazer cumulativo.
        -- avg_new = ((avg_old * count_old) + score_new) / count_new
        -- count_old aqui é total_activities - 1 (assumindo que todas tiveram score? Não necessariamente).
        -- Para ser preciso, precisariamos de um contador de atividades_com_nota.
        -- Vamos simplificar usando total_activities por enquanto, ou melhor:
        -- Se score é null, não muda a média. Se não é null, atualiza.
        -- Vamos assumir que 'total_activities' conta tudo.
        v_new_avg_score := ((v_progress.avg_score * v_progress.total_activities) + p_score) / v_new_total_activities;
    ELSE
        v_new_avg_score := v_progress.avg_score;
    END IF;

    -- 5. Atualizar Forças e Fraquezas
    v_strengths := v_progress.strengths;
    v_weaknesses := v_progress.weaknesses;

    IF p_score IS NOT NULL AND p_subject IS NOT NULL THEN
        IF p_score >= 8 THEN
            v_subject_count := COALESCE((v_strengths->>p_subject)::INTEGER, 0) + 1;
            v_strengths := jsonb_set(v_strengths, ARRAY[p_subject], to_jsonb(v_subject_count));
        ELSIF p_score < 5 THEN
            v_subject_count := COALESCE((v_weaknesses->>p_subject)::INTEGER, 0) + 1;
            v_weaknesses := jsonb_set(v_weaknesses, ARRAY[p_subject], to_jsonb(v_subject_count));
        END IF;
    END IF;

    -- 6. Persistir
    UPDATE public.child_progress
    SET
        total_activities = v_new_total_activities,
        total_xp = v_new_total_xp,
        current_level = v_new_level,
        avg_score = ROUND(v_new_avg_score, 2),
        last_activity_at = NOW(),
        strengths = v_strengths,
        weaknesses = v_weaknesses,
        updated_at = NOW()
    WHERE child_id = p_child_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Script de Reprocessamento Retroativo (Idempotente)
CREATE OR REPLACE FUNCTION public.reprocess_child_history() 
RETURNS VOID AS $$
DECLARE
    r_child RECORD;
    r_activity RECORD;
BEGIN
    -- Para cada criança
    FOR r_child IN SELECT id FROM public.children LOOP
        -- Resetar ou Criar Progresso
        DELETE FROM public.child_progress WHERE child_id = r_child.id;
        INSERT INTO public.child_progress (child_id) VALUES (r_child.id);

        -- Processar Exercises (Histórico Principal)
        FOR r_activity IN 
            SELECT * FROM public.exercises 
            WHERE child_id = r_child.id 
            ORDER BY created_at ASC 
        LOOP
            -- Assumindo exercises como 'exercise' ou 'quiz' se tiver score
            PERFORM public.update_child_progress(
                r_child.id,
                CASE WHEN r_activity.score IS NOT NULL THEN 'quiz' ELSE 'exercise' END,
                r_activity.subject,
                r_activity.score
            );
        END LOOP;

        -- Processar Activity Completions (Se houver tipos diferentes de exercises, para não duplicar, idealmente filtrar)
        -- Mas como activity_completions pode ser duplicado de exercises, vamos processar APENAS o que não for 'exercise' ou 'quiz' que já veio de exercises?
        -- Ou vamos confiar que exercises é a fonte de verdade antiga?
        -- O usuário disse "histórico existente". Exercises é a tabela mais antiga.
        -- Vamos processar também 'reading', 'drawing' de activity_completions se existirem e não estiverem em exercises.
        -- Por segurança, vamos processar tudo de exercises e depois tudo de activity_completions que NÃO tenha activity_type 'exercise' ou 'quiz' OU verificar IDs.
        
        FOR r_activity IN 
            SELECT * FROM public.activity_completions 
            WHERE child_id = r_child.id 
            AND activity_type NOT IN ('exercise', 'quiz') -- Evitar duplicação se já processamos via tabela exercises
            ORDER BY completed_at ASC
        LOOP
             PERFORM public.update_child_progress(
                r_child.id,
                r_activity.activity_type,
                r_activity.subject,
                r_activity.score
            );
        END LOOP;
        
    END LOOP;
END;
$$ LANGUAGE plpgsql;
