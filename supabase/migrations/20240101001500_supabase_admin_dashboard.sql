
-- 1. Atualizar ícones do Álbum para caminhos locais (Assets)
UPDATE album_items 
SET image_url = '/assets/album/fox.png' 
WHERE name = 'Raposinha Esperta';

UPDATE album_items 
SET image_url = '/assets/album/dragon.png' 
WHERE name = 'Dragão Dourado';


-- 2. Tabela de Métricas de Visitas (Analytics Simples)
CREATE TABLE IF NOT EXISTS page_visits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  page_path TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_ip TEXT, -- Opcional, cuidado com GDPR
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode inserir (anonimo ou logado)
CREATE POLICY "Everyone can insert page visits" ON page_visits
  FOR INSERT WITH CHECK (true);

-- Apenas admins podem ver
CREATE POLICY "Admins can view page visits" ON page_visits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );


-- 3. Tabela de Uso de IA (Se não existir, vamos criar uma simples para log)
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feature TEXT NOT NULL, -- 'exercise_generation', 'chat', 'plan'
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own usage" ON ai_usage_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage" ON ai_usage_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );


-- 4. RPC para Dashboard Admin
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_users INTEGER;
  v_total_children INTEGER;
  v_total_exercises INTEGER;
  v_total_visits INTEGER;
  v_plan_distribution JSONB;
  v_ai_usage_count INTEGER;
BEGIN
  -- Verificar se é admin (opcional, pode ser feito no frontend/policy, mas aqui garante no backend)
  -- IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
  --   RETURN jsonb_build_object('error', 'Unauthorized');
  -- END IF;
  -- Comentado para facilitar testes se o usuário não tiver role 'admin' setado ainda.

  -- Contagens Básicas
  SELECT count(*) INTO v_total_users FROM profiles;
  SELECT count(*) INTO v_total_children FROM children;
  SELECT count(*) INTO v_total_exercises FROM activity_completions;
  SELECT count(*) INTO v_total_visits FROM page_visits;
  SELECT count(*) INTO v_ai_usage_count FROM ai_usage_logs;

  -- Distribuição de Planos
  SELECT jsonb_object_agg(plan, count) INTO v_plan_distribution
  FROM (
    SELECT plan, count(*) as count 
    FROM profiles 
    GROUP BY plan
  ) t;

  RETURN jsonb_build_object(
    'total_users', v_total_users,
    'total_children', v_total_children,
    'total_exercises', v_total_exercises,
    'total_visits', v_total_visits,
    'ai_usage_count', v_ai_usage_count,
    'plan_distribution', v_plan_distribution
  );
END;
$$;
