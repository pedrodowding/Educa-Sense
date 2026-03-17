-- MIGRATION SCRIPT FOR ACTIVITY COMPLETIONS
-- Copy and paste this into the Supabase SQL Editor to apply changes

-- 1. Create the table
CREATE TABLE IF NOT EXISTS activity_completions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL, -- ID do exercício ou quiz
  activity_type TEXT NOT NULL, -- 'quiz', 'exercise', 'reading', 'checkin'
  subject TEXT,
  difficulty TEXT,
  score NUMERIC,
  stars INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_date DATE DEFAULT CURRENT_DATE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Enable RLS
ALTER TABLE activity_completions ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies
DROP POLICY IF EXISTS "Guardians can view their children's completions" ON activity_completions;
CREATE POLICY "Guardians can view their children's completions" ON activity_completions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = activity_completions.child_id AND children.guardian_id = auth.uid())
  );

DROP POLICY IF EXISTS "Guardians can insert completions for their children" ON activity_completions;
CREATE POLICY "Guardians can insert completions for their children" ON activity_completions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM children WHERE children.id = activity_completions.child_id AND children.guardian_id = auth.uid())
  );

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_activity_completions_child_date ON activity_completions(child_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_activity_completions_parent_date ON activity_completions(parent_id, completed_date);

-- 5. Create Gamification Trigger Function
CREATE OR REPLACE FUNCTION public.handle_activity_completion()
RETURNS trigger AS $$
DECLARE
  v_last_completion_date DATE;
  v_current_streak INTEGER;
  v_new_streak INTEGER;
  v_xp_to_add INTEGER;
  v_stars_to_add INTEGER;
BEGIN
  -- 1. Calcular XP e Estrelas a adicionar
  v_xp_to_add := COALESCE(new.xp, 0);
  v_stars_to_add := COALESCE(new.stars, 0);

  -- 2. Gerenciar Streak
  -- Buscar estado ATUAL da criança
  SELECT 
    COALESCE(streak, 0)
  INTO v_current_streak
  FROM public.children
  WHERE id = new.child_id;

  -- Buscar a última data de conclusão (excluindo a atual)
  SELECT MAX(completed_date)
  INTO v_last_completion_date
  FROM public.activity_completions
  WHERE child_id = new.child_id
    AND id != new.id; 

  IF v_last_completion_date = new.completed_date THEN
    -- Já fez atividade hoje, mantém streak
    v_new_streak := v_current_streak;
  ELSIF v_last_completion_date = (new.completed_date - INTERVAL '1 day')::DATE THEN
    -- Fez atividade ontem, incrementa
    v_new_streak := v_current_streak + 1;
  ELSE
    -- Quebrou a sequência ou é o primeiro dia
    v_new_streak := 1;
  END IF;

  -- 3. Atualizar tabela children
  UPDATE public.children
  SET 
    xp = COALESCE(xp, 0) + v_xp_to_add,
    stars = COALESCE(stars, 0) + v_stars_to_add,
    streak = v_new_streak
  WHERE id = new.child_id;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach Trigger
DROP TRIGGER IF EXISTS on_activity_completed ON public.activity_completions;
CREATE TRIGGER on_activity_completed
  AFTER INSERT ON public.activity_completions
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_activity_completion();
