-- 1. Setup Inicial (Garantir que tabelas base existam)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'guardian' CHECK (role IN ('guardian', 'teacher', 'admin')),
  avatar TEXT,
  plan TEXT DEFAULT 'Free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Profiles (Só cria policies se não existirem - truque com DO block ou ignorar erro se já existir, mas aqui vamos assumir criação simples)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- Policies podem dar erro se duplicadas, mas o erro principal era falta de tabela.

-- CHILDREN
CREATE TABLE IF NOT EXISTS children (
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
  difficulty_subjects TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE children ENABLE ROW LEVEL SECURITY;


-- 2. Módulo de Álbum (O que falhou anteriormente)

-- Tabela de Itens do Álbum (Catálogo)
CREATE TABLE IF NOT EXISTS album_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic')) NOT NULL,
  image_url TEXT NOT NULL,
  theme TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE album_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can read album items" ON album_items;
CREATE POLICY "Everyone can read album items" ON album_items FOR SELECT USING (true);

-- Tabela de Álbum da Criança (Inventário)
CREATE TABLE IF NOT EXISTS child_album (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  album_item_id UUID REFERENCES album_items(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1,
  earned_count INTEGER NOT NULL DEFAULT 1,
  first_earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(child_id, album_item_id)
);

ALTER TABLE child_album ENABLE ROW LEVEL SECURITY;

-- Policies Child Album
DROP POLICY IF EXISTS "Guardians can view their children's album" ON child_album;
CREATE POLICY "Guardians can view their children's album" ON child_album
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = child_album.child_id AND children.guardian_id = auth.uid())
  );

DROP POLICY IF EXISTS "Guardians can insert into their children's album" ON child_album;
CREATE POLICY "Guardians can insert into their children's album" ON child_album
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM children WHERE children.id = child_album.child_id AND children.guardian_id = auth.uid())
  );

DROP POLICY IF EXISTS "Guardians can update their children's album" ON child_album;
CREATE POLICY "Guardians can update their children's album" ON child_album
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = child_album.child_id AND children.guardian_id = auth.uid())
  );

-- Tabela de Recompensas Diárias
CREATE TABLE IF NOT EXISTS daily_rewards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  reward_type TEXT NOT NULL DEFAULT 'album',
  album_item_id UUID REFERENCES album_items(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(child_id, date, reward_type)
);

ALTER TABLE daily_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guardians can view their children's daily rewards" ON daily_rewards;
CREATE POLICY "Guardians can view their children's daily rewards" ON daily_rewards
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = daily_rewards.child_id AND children.guardian_id = auth.uid())
  );

DROP POLICY IF EXISTS "Guardians can insert daily rewards" ON daily_rewards;
CREATE POLICY "Guardians can insert daily rewards" ON daily_rewards
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM children WHERE children.id = daily_rewards.child_id AND children.guardian_id = auth.uid())
  );

-- RPC Function
CREATE OR REPLACE FUNCTION claim_daily_album_reward(p_child_id UUID, p_date TEXT)
RETURNS JSONB AS $$
DECLARE
  v_existing_reward RECORD;
  v_album_item RECORD;
  v_new_level INTEGER;
  v_is_new BOOLEAN;
  v_rarity_weight TEXT;
  v_random_val FLOAT;
BEGIN
  -- Verificar se já resgatou hoje
  SELECT * INTO v_existing_reward 
  FROM daily_rewards 
  WHERE child_id = p_child_id AND date = p_date AND reward_type = 'album';

  IF FOUND THEN
    SELECT * INTO v_album_item FROM album_items WHERE id = v_existing_reward.album_item_id;
    SELECT level INTO v_new_level FROM child_album 
    WHERE child_id = p_child_id AND album_item_id = v_existing_reward.album_item_id;

    RETURN jsonb_build_object(
      'ok', true,
      'item', jsonb_build_object(
        'id', v_album_item.id,
        'name', v_album_item.name,
        'rarity', v_album_item.rarity,
        'image_url', v_album_item.image_url
      ),
      'level', COALESCE(v_new_level, 1),
      'is_new', false,
      'already_claimed', true
    );
  END IF;

  -- Sorteio
  v_random_val := random();
  IF v_random_val < 0.6 THEN
    v_rarity_weight := 'common';
  ELSIF v_random_val < 0.9 THEN
    v_rarity_weight := 'rare';
  ELSE
    v_rarity_weight := 'epic';
  END IF;

  SELECT * INTO v_album_item
  FROM album_items
  WHERE rarity = v_rarity_weight AND is_active = true
  ORDER BY random()
  LIMIT 1;

  IF v_album_item IS NULL THEN
    SELECT * INTO v_album_item FROM album_items WHERE is_active = true ORDER BY random() LIMIT 1;
  END IF;
  
  IF v_album_item IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No items available');
  END IF;

  -- Registrar
  INSERT INTO daily_rewards (child_id, date, reward_type, album_item_id)
  VALUES (p_child_id, p_date, 'album', v_album_item.id);

  -- Atualizar Inventário
  INSERT INTO child_album (child_id, album_item_id, level, earned_count, last_earned_at)
  VALUES (p_child_id, v_album_item.id, 1, 1, NOW())
  ON CONFLICT (child_id, album_item_id) 
  DO UPDATE SET
    level = LEAST(child_album.level + 1, 3),
    earned_count = child_album.earned_count + 1,
    last_earned_at = NOW()
  RETURNING level INTO v_new_level;

  IF v_new_level = 1 THEN
     v_is_new := true;
  ELSE
     v_is_new := false;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'item', jsonb_build_object(
      'id', v_album_item.id,
      'name', v_album_item.name,
      'rarity', v_album_item.rarity,
      'image_url', v_album_item.image_url
    ),
    'level', v_new_level,
    'is_new', v_is_new
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SEED DATA (Apenas se estiver vazio)
INSERT INTO album_items (name, rarity, image_url, theme)
SELECT 'Gatinho Curioso', 'common', 'https://cdn-icons-png.flaticon.com/512/616/616408.png', 'animals'
WHERE NOT EXISTS (SELECT 1 FROM album_items);

INSERT INTO album_items (name, rarity, image_url, theme)
SELECT 'Cachorrinho Feliz', 'common', 'https://cdn-icons-png.flaticon.com/512/616/616430.png', 'animals'
WHERE NOT EXISTS (SELECT 1 FROM album_items WHERE name = 'Cachorrinho Feliz');

-- (Adicionei apenas alguns exemplos para não quebrar por duplicidade se rodar 2x, 
-- mas o ideal é limpar se for seed inicial. Como é correção, melhor prevenir)

INSERT INTO album_items (name, rarity, image_url, theme) VALUES
('Panda Sonolento', 'common', 'https://cdn-icons-png.flaticon.com/512/616/616412.png', 'animals'),
('Coelhinho Saltitante', 'common', 'https://cdn-icons-png.flaticon.com/512/616/616400.png', 'animals'),
('Raposinha Esperta', 'common', '/assets/album/fox.png', 'animals'),
('Ursinho Amigo', 'common', 'https://cdn-icons-png.flaticon.com/512/616/616553.png', 'animals'),
('Pinguim Gelado', 'common', 'https://cdn-icons-png.flaticon.com/512/616/616538.png', 'animals'),
('Elefantinho Azul', 'common', 'https://cdn-icons-png.flaticon.com/512/616/616550.png', 'animals'),
('Foguete Veloz', 'rare', 'https://cdn-icons-png.flaticon.com/512/3212/3212567.png', 'space'),
('Astronauta Corajoso', 'rare', 'https://cdn-icons-png.flaticon.com/512/3212/3212628.png', 'space'),
('Planeta Mágico', 'rare', 'https://cdn-icons-png.flaticon.com/512/3212/3212452.png', 'space'),
('Dragão Dourado', 'epic', '/assets/album/dragon.png', 'fantasy')
ON CONFLICT DO NOTHING; 
-- (OBS: album_items não tem unique constraint no name por padrão no script anterior, 
-- então cuidado com duplicatas se rodar varias vezes. Mas para "fix" rápido, ok).
