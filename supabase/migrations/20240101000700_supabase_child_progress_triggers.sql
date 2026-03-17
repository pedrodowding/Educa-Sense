-- Trigger Function for Activity Completions (Main Source)
CREATE OR REPLACE FUNCTION public.trigger_update_child_progress_from_completion()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.update_child_progress(
        NEW.child_id,
        NEW.activity_type,
        NEW.subject,
        NEW.score
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_activity_completion_progress ON public.activity_completions;
CREATE TRIGGER on_activity_completion_progress
AFTER INSERT ON public.activity_completions
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_update_child_progress_from_completion();

-- Trigger Function for Exercises (Secondary Source: Reading, etc.)
CREATE OR REPLACE FUNCTION public.trigger_update_child_progress_from_exercise()
RETURNS TRIGGER AS $$
DECLARE
    v_type TEXT;
BEGIN
    -- Only process if completed changed to true
    IF NEW.completed = TRUE AND (OLD.completed = FALSE OR OLD.completed IS NULL) THEN
        
        -- Determine Type from Content
        v_type := NEW.content->>'type';
        
        -- Logic: 
        -- 1. Ignore Quizzes (handled by activity_completions via QuizPage)
        IF v_type IN ('multipla', 'dissertativa', 'mista', 'quiz') THEN
            RETURN NEW;
        END IF;

        -- 2. Process Leitura Guiada
        IF v_type = 'leitura_guiada' THEN
            PERFORM public.update_child_progress(
                NEW.child_id,
                'reading', 
                NEW.subject,
                NEW.score
            );
        END IF;
        
        -- 3. Process Artes (if detected)
        IF v_type = 'artes' OR NEW.subject = 'Artes' THEN
             PERFORM public.update_child_progress(
                NEW.child_id,
                'drawing', 
                NEW.subject,
                NEW.score
            );
        END IF;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_exercise_completion_progress ON public.exercises;
CREATE TRIGGER on_exercise_completion_progress
AFTER UPDATE ON public.exercises
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_update_child_progress_from_exercise();


-- REPROCESSAMENTO RETROATIVO MELHORADO (Smarter)
CREATE OR REPLACE FUNCTION public.reprocess_child_history() 
RETURNS VOID AS $$
DECLARE
    r_child RECORD;
    r_completion RECORD;
    r_exercise RECORD;
    v_processed_ids UUID[];
BEGIN
    -- Para cada criança
    FOR r_child IN SELECT id FROM public.children LOOP
        -- Resetar Progresso
        DELETE FROM public.child_progress WHERE child_id = r_child.id;
        INSERT INTO public.child_progress (child_id) VALUES (r_child.id);
        
        v_processed_ids := ARRAY[]::UUID[];

        -- 1. Processar Activity Completions (Fonte de Verdade Principal)
        FOR r_completion IN 
            SELECT * FROM public.activity_completions 
            WHERE child_id = r_child.id 
            ORDER BY completed_at ASC 
        LOOP
            PERFORM public.update_child_progress(
                r_child.id,
                r_completion.activity_type,
                r_completion.subject,
                r_completion.score
            );
            -- Guardar ID do exercício original para não duplicar
            IF r_completion.activity_id IS NOT NULL THEN
                v_processed_ids := array_append(v_processed_ids, r_completion.activity_id);
            END IF;
        END LOOP;

        -- 2. Processar Exercises (Histórico Antigo ou Leitura)
        -- Apenas se ID não estiver em v_processed_ids E estiver completado
        FOR r_exercise IN 
            SELECT * FROM public.exercises 
            WHERE child_id = r_child.id 
            AND (completed = TRUE OR score IS NOT NULL) 
            AND (id <> ALL(v_processed_ids)) -- Não duplicar
            ORDER BY created_at ASC 
        LOOP
            -- Determinar tipo
            IF r_exercise.content->>'type' = 'leitura_guiada' THEN
                PERFORM public.update_child_progress(r_child.id, 'reading', r_exercise.subject, r_exercise.score);
            ELSE
                -- Default para quiz/exercise se não identificado e não processado via completion
                PERFORM public.update_child_progress(r_child.id, 'quiz', r_exercise.subject, r_exercise.score);
            END IF;
        END LOOP;
        
    END LOOP;
END;
$$ LANGUAGE plpgsql;
