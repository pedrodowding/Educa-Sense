-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES (Users: Guardians & Teachers)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'guardian' CHECK (role IN ('guardian', 'teacher', 'admin')),
  avatar TEXT,
  plan TEXT DEFAULT 'Free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- CHILDREN (Students)
CREATE TABLE children (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  guardian_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  grade TEXT,
  avatar TEXT,
  access_code TEXT UNIQUE,
  xp INTEGER DEFAULT 0,
  stars INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  difficulty_subjects TEXT[], -- Array of strings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for children
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guardians can view their children" ON children
  FOR SELECT USING (auth.uid() = guardian_id);

CREATE POLICY "Guardians can manage their children" ON children
  FOR ALL USING (auth.uid() = guardian_id);

-- CHILD DEVICES (Student login tracking)
CREATE TABLE child_devices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  info JSONB DEFAULT '{}'::jsonb,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(child_id, device_id)
);

ALTER TABLE child_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guardians can view their children's devices" ON child_devices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = child_devices.child_id AND children.guardian_id = auth.uid())
  );

CREATE POLICY "Guardians can manage their children's devices" ON child_devices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = child_devices.child_id AND children.guardian_id = auth.uid())
  );

-- EXERCISES (History)
CREATE TABLE exercises (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  subject TEXT,
  difficulty TEXT,
  score INTEGER,
  total_questions INTEGER,
  correct_answers INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for exercises
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guardians can view their children's exercises" ON exercises
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = exercises.child_id AND children.guardian_id = auth.uid())
  );

CREATE POLICY "Guardians can insert exercises for their children" ON exercises
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM children WHERE children.id = exercises.child_id AND children.guardian_id = auth.uid())
  );

CREATE POLICY "Guardians can update their children's exercises" ON exercises
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = exercises.child_id AND children.guardian_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM children WHERE children.id = exercises.child_id AND children.guardian_id = auth.uid())
  );

CREATE POLICY "Guardians can delete their children's exercises" ON exercises
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = exercises.child_id AND children.guardian_id = auth.uid())
  );

-- DAILY CHECK-INS
CREATE TABLE daily_checkins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  mood TEXT,
  feeling TEXT,
  sleep_quality INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for check-ins
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guardians can view/manage check-ins" ON daily_checkins
  FOR ALL USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = daily_checkins.child_id AND children.guardian_id = auth.uid())
  );

-- BEHAVIOR GOALS
CREATE TABLE behavior_goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  target INTEGER NOT NULL,
  progress INTEGER DEFAULT 0,
  reward TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for goals
ALTER TABLE behavior_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guardians can view/manage goals" ON behavior_goals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = behavior_goals.child_id AND children.guardian_id = auth.uid())
  );

-- ACTIVITY COMPLETIONS (Unified Progress Tracking)
CREATE TABLE activity_completions (
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

-- Enable RLS for activity_completions
ALTER TABLE activity_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guardians can view their children's completions" ON activity_completions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = activity_completions.child_id AND children.guardian_id = auth.uid())
  );

CREATE POLICY "Guardians can insert completions for their children" ON activity_completions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM children WHERE children.id = activity_completions.child_id AND children.guardian_id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX idx_activity_completions_child_date ON activity_completions(child_id, completed_date);
CREATE INDEX idx_activity_completions_parent_date ON activity_completions(parent_id, completed_date);

-- FUNCTION TO UPDATE GAMIFICATION (XP & STREAK) ON COMPLETION
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
  -- Buscar a data da última atividade DESTE aluno (excluindo a atual que acabou de ser inserida, se trigger for AFTER, mas aqui é BEFORE ou AFTER? Vamos usar AFTER para garantir)
  -- Na verdade, precisamos ver o estado ATUAL da criança antes de atualizar
  
  SELECT 
    COALESCE(streak, 0)
  INTO v_current_streak
  FROM public.children
  WHERE id = new.child_id;

  -- Buscar a última data de conclusão (excluindo hoje se já houver outra hoje, mas o que importa é a última ANTES de hoje)
  -- Melhor: verificar se existe alguma completion ONTEM
  -- Se existe completion HOJE (além desta), streak não muda.
  -- Se existe completion ONTEM, streak + 1.
  -- Se não existe ONTEM e nem HOJE (antes desta), streak = 1.
  
  -- Para simplificar: olhamos a última data registrada em activity_completions (excluindo o registro atual se for AFTER trigger)
  SELECT MAX(completed_date)
  INTO v_last_completion_date
  FROM public.activity_completions
  WHERE child_id = new.child_id
    AND id != new.id; -- Ignora a própria linha se for AFTER trigger

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

  -- 4. (Opcional) Logar no gamification_logs se ainda usarmos essa tabela para histórico detalhado de XP
  -- Por enquanto, activity_completions já serve como log, então não duplicaremos para gamification_logs a menos que necessário.

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER
DROP TRIGGER IF EXISTS on_activity_completed ON public.activity_completions;
CREATE TRIGGER on_activity_completed
  AFTER INSERT ON public.activity_completions
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_activity_completion();

-- FUNCTION TO HANDLE NEW USER SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'guardian');
  IF v_role NOT IN ('guardian', 'teacher') THEN
    v_role := 'guardian';
  END IF;
  INSERT INTO public.profiles (id, email, name, role, avatar)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name', v_role, new.raw_user_meta_data->>'avatar');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER FOR NEW USER
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Student login via access code + device registration
CREATE OR REPLACE FUNCTION public.register_child_device(
  p_access_code TEXT,
  p_device_id TEXT,
  p_info JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_child children%ROWTYPE;
  v_device child_devices%ROWTYPE;
BEGIN
  SELECT * INTO v_child
  FROM public.children
  WHERE access_code = p_access_code
  LIMIT 1;

  IF v_child.id IS NULL THEN
    RAISE EXCEPTION 'Código inválido';
  END IF;

  INSERT INTO public.child_devices (child_id, device_id, info, last_seen)
  VALUES (v_child.id, p_device_id, COALESCE(p_info, '{}'::jsonb), NOW())
  ON CONFLICT (child_id, device_id)
  DO UPDATE SET info = EXCLUDED.info, last_seen = NOW()
  RETURNING * INTO v_device;

  RETURN jsonb_build_object(
    'child', jsonb_build_object(
      'id', v_child.id,
      'name', v_child.name,
      'age', v_child.age,
      'grade', v_child.grade,
      'avatar', v_child.avatar,
      'access_code', v_child.access_code,
      'xp', v_child.xp,
      'stars', v_child.stars,
      'streak', v_child.streak,
      'difficulty_subjects', v_child.difficulty_subjects
    ),
    'device', jsonb_build_object(
      'id', v_device.id,
      'device_id', v_device.device_id,
      'info', v_device.info,
      'last_seen', v_device.last_seen,
      'created_at', v_device.created_at
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_child_device(TEXT, TEXT, JSONB) TO anon, authenticated;
