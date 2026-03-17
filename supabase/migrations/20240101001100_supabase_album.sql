
-- Tabela de Itens do Álbum (Catálogo)
CREATE TABLE album_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic')) NOT NULL,
  image_url TEXT NOT NULL,
  theme TEXT, -- 'animals', 'space', 'fantasy', etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para album_items
ALTER TABLE album_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read album items" ON album_items FOR SELECT USING (true);

-- Tabela de Álbum da Criança (Inventário)
CREATE TABLE child_album (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  album_item_id UUID REFERENCES album_items(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1,
  earned_count INTEGER NOT NULL DEFAULT 1,
  first_earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(child_id, album_item_id)
);

-- RLS para child_album
ALTER TABLE child_album ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guardians can view their children's album" ON child_album
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = child_album.child_id AND children.guardian_id = auth.uid())
  );

CREATE POLICY "Guardians can insert into their children's album" ON child_album
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM children WHERE children.id = child_album.child_id AND children.guardian_id = auth.uid())
  );

CREATE POLICY "Guardians can update their children's album" ON child_album
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = child_album.child_id AND children.guardian_id = auth.uid())
  );

-- Tabela de Recompensas Diárias (Controle de resgate)
CREATE TABLE daily_rewards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  date TEXT NOT NULL, -- YYYY-MM-DD
  reward_type TEXT NOT NULL DEFAULT 'album',
  album_item_id UUID REFERENCES album_items(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(child_id, date, reward_type)
);

-- RLS para daily_rewards
ALTER TABLE daily_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guardians can view their children's daily rewards" ON daily_rewards
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = daily_rewards.child_id AND children.guardian_id = auth.uid())
  );

CREATE POLICY "Guardians can insert daily rewards" ON daily_rewards
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM children WHERE children.id = daily_rewards.child_id AND children.guardian_id = auth.uid())
  );

-- RPC Function: Claim Daily Reward
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
  -- 1. Verificar se já resgatou hoje (Idempotência)
  SELECT * INTO v_existing_reward 
  FROM daily_rewards 
  WHERE child_id = p_child_id AND date = p_date AND reward_type = 'album';

  IF FOUND THEN
    -- Buscar dados do item já ganho
    SELECT * INTO v_album_item FROM album_items WHERE id = v_existing_reward.album_item_id;
    
    -- Buscar nível atual
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

  -- 2. Sorteio de Rarity (Common: 60%, Rare: 30%, Epic: 10%)
  v_random_val := random();
  IF v_random_val < 0.6 THEN
    v_rarity_weight := 'common';
  ELSIF v_random_val < 0.9 THEN
    v_rarity_weight := 'rare';
  ELSE
    v_rarity_weight := 'epic';
  END IF;

  -- 3. Selecionar item aleatório dessa raridade
  SELECT * INTO v_album_item
  FROM album_items
  WHERE rarity = v_rarity_weight AND is_active = true
  ORDER BY random()
  LIMIT 1;

  -- Fallback se não tiver itens da raridade sorteada (pega qualquer um)
  IF v_album_item IS NULL THEN
    SELECT * INTO v_album_item FROM album_items WHERE is_active = true ORDER BY random() LIMIT 1;
  END IF;
  
  IF v_album_item IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No items available');
  END IF;

  -- 4. Registrar Daily Reward
  INSERT INTO daily_rewards (child_id, date, reward_type, album_item_id)
  VALUES (p_child_id, p_date, 'album', v_album_item.id);

  -- 5. Atualizar Inventário (Child Album)
  INSERT INTO child_album (child_id, album_item_id, level, earned_count, last_earned_at)
  VALUES (p_child_id, v_album_item.id, 1, 1, NOW())
  ON CONFLICT (child_id, album_item_id) 
  DO UPDATE SET
    level = LEAST(child_album.level + 1, 3), -- Max level 3
    earned_count = child_album.earned_count + 1,
    last_earned_at = NOW()
  RETURNING level INTO v_new_level;

  v_is_new := (v_new_level = 1 AND (SELECT count(*) FROM child_album WHERE child_id = p_child_id AND album_item_id = v_album_item.id) = 1); 
  -- Ajuste lógica is_new: se insert ocorreu, xmin é novo... mas simplificando:
  -- Se earned_count era 0 (novo insert), is_new = true. Mas no ON CONFLICT não sabemos o estado anterior fácil.
  -- Vamos assumir: se v_new_level > 1, não é novo. Se v_new_level = 1, pode ser novo ou repetido lvl 1 (mas logica diz que soma +1).
  -- Correção: Se level foi para 2 ou 3, com certeza não é novo. Se level é 1, é novo.
  
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

-- SEED DATA (Placeholder Items)
-- Usaremos ícones do Material Symbols ou URLs placeholders
INSERT INTO album_items (name, rarity, image_url, theme) VALUES
-- Common (Animais)
('Gatinho Curioso', 'common', 'https://cdn-icons-png.flaticon.com/512/616/616408.png', 'animals'),
('Cachorrinho Feliz', 'common', 'https://cdn-icons-png.flaticon.com/512/616/616430.png', 'animals'),
('Panda Sonolento', 'common', 'https://cdn-icons-png.flaticon.com/512/616/616412.png', 'animals'),
('Coelhinho Saltitante', 'common', 'https://cdn-icons-png.flaticon.com/512/616/616400.png', 'animals'),
('Raposinha Esperta', 'common', '/assets/album/fox.png', 'animals'),
('Ursinho Amigo', 'common', 'https://cdn-icons-png.flaticon.com/512/616/616553.png', 'animals'),
('Pinguim Gelado', 'common', 'https://cdn-icons-png.flaticon.com/512/616/616538.png', 'animals'),
('Elefantinho Azul', 'common', 'https://cdn-icons-png.flaticon.com/512/616/616550.png', 'animals'),

-- Rare (Espaço/Fantasia)
('Foguete Veloz', 'rare', 'https://cdn-icons-png.flaticon.com/512/3212/3212567.png', 'space'),
('Astronauta Corajoso', 'rare', 'https://cdn-icons-png.flaticon.com/512/3212/3212628.png', 'space'),
('Planeta Mágico', 'rare', 'https://cdn-icons-png.flaticon.com/512/3212/3212452.png', 'space'),

-- Epic (Lendários)
('Dragão Dourado', 'epic', '/assets/album/dragon.png', 'fantasy');
