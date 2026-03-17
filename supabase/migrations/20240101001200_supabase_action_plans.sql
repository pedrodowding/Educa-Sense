
-- Tabela de Planos de Ação (IA)
CREATE TABLE IF NOT EXISTS action_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  summary TEXT,
  tasks JSONB DEFAULT '[]'::jsonb, -- Array de tarefas {id, description, completed}
  alert TEXT, -- Alerta de segurança ou atenção
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_action_plans_child ON action_plans(child_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_active ON action_plans(child_id, active);

-- RLS (Segurança)
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guardians can view their children's action plans" ON action_plans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = action_plans.child_id AND children.guardian_id = auth.uid())
  );

CREATE POLICY "Guardians can insert action plans for their children" ON action_plans
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM children WHERE children.id = action_plans.child_id AND children.guardian_id = auth.uid())
  );

CREATE POLICY "Guardians can update their children's action plans" ON action_plans
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = action_plans.child_id AND children.guardian_id = auth.uid())
  );
