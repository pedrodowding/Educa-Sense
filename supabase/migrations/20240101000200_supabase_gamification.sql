
-- Tabela de Logs de Gamificação (Audit trail de XP e Estrelas)
CREATE TABLE gamification_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'exercise_completed', 'daily_streak', 'bonus', 'badge_earned'
  xp_earned INTEGER DEFAULT 0,
  stars_earned INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb, -- Para linkar com exercise_id, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para logs
CREATE INDEX gamification_logs_child_id_idx ON gamification_logs (child_id);
CREATE INDEX gamification_logs_created_at_idx ON gamification_logs (created_at);

-- RLS para logs
ALTER TABLE gamification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guardians can view their children's gamification logs" ON gamification_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = gamification_logs.child_id AND children.guardian_id = auth.uid())
  );

CREATE POLICY "Guardians can insert gamification logs" ON gamification_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM children WHERE children.id = gamification_logs.child_id AND children.guardian_id = auth.uid())
  );

-- Tabela de Definição de Badges (Conquistas)
CREATE TABLE badges (
  id TEXT PRIMARY KEY, -- ex: 'first_exercise', 'math_master_1'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- Material Symbol ou URL
  category TEXT, -- 'milestone', 'subject', 'streak'
  requirements JSONB DEFAULT '{}'::jsonb, -- Regras para desbloqueio (opcional, se for automatizar no back)
  xp_bonus INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir Badges Iniciais
INSERT INTO badges (id, name, description, icon, category, xp_bonus) VALUES
('first_win', 'Primeira Vitória', 'Completou a primeira atividade!', 'emoji_events', 'milestone', 50),
('math_explorer', 'Explorador Matemático', 'Completou 5 atividades de Matemática.', 'calculate', 'subject', 100),
('bookworm', 'Traça de Livros', 'Completou 5 atividades de Português.', 'menu_book', 'subject', 100),
('streak_3', 'Em Chamas', 'Manteve uma ofensiva de 3 dias seguidos.', 'local_fire_department', 'streak', 150),
('streak_7', 'Imparável', 'Manteve uma ofensiva de 7 dias seguidos.', 'bolt', 'streak', 300),
('science_wiz', 'Cientista Maluco', 'Completou 3 atividades de Ciências.', 'science', 'subject', 100),
('artist', 'Pequeno Picasso', 'Criou 3 obras de arte.', 'palette', 'subject', 100),
('early_bird', 'Madrugador', 'Fez uma atividade antes das 8h da manhã.', 'wb_sunny', 'milestone', 50);

-- Habilitar leitura pública de badges (todos podem ver quais badges existem)
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view badges" ON badges FOR SELECT USING (true);

-- Tabela de Badges dos Alunos (Relacionamento N:N)
CREATE TABLE child_badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  badge_id TEXT REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(child_id, badge_id)
);

-- RLS para child_badges
ALTER TABLE child_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guardians can view their children's badges" ON child_badges
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = child_badges.child_id AND children.guardian_id = auth.uid())
  );

CREATE POLICY "Guardians can insert badges for their children" ON child_badges
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM children WHERE children.id = child_badges.child_id AND children.guardian_id = auth.uid())
  );
