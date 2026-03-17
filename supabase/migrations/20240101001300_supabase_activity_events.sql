-- Tabela de Eventos de Atividade da Criança (Child Activity Events)
-- Usada para construir o Mapa de Competências e histórico detalhado

CREATE TABLE IF NOT EXISTS child_activity_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'exercise', 'quiz', 'reading', 'checkin', etc.
  subject TEXT NOT NULL, -- 'Português', 'Matemática', 'Ciências', etc.
  competency TEXT, -- Opcional: 'Leitura', 'Soma', 'Interpretação'
  score NUMERIC, -- 0 a 10
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_child_activity_events_child_completed 
ON child_activity_events (child_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_child_activity_events_child_subject 
ON child_activity_events (child_id, subject);

-- RLS (Segurança)
ALTER TABLE child_activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guardians can view their children's activity events" ON child_activity_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = child_activity_events.child_id AND children.guardian_id = auth.uid())
  );

CREATE POLICY "Guardians can insert activity events for their children" ON child_activity_events
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM children WHERE children.id = child_activity_events.child_id AND children.guardian_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS child_behavior_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_week TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_child_behavior_events_child_date ON child_behavior_events(child_id, event_date);
CREATE INDEX IF NOT EXISTS idx_child_behavior_events_child_week ON child_behavior_events(child_id, event_week);

ALTER TABLE child_behavior_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guardians can view their children's behavior events" ON child_behavior_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = child_behavior_events.child_id AND children.guardian_id = auth.uid())
  );

CREATE POLICY "Guardians can insert behavior events for their children" ON child_behavior_events
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM children WHERE children.id = child_behavior_events.child_id AND children.guardian_id = auth.uid())
  );
