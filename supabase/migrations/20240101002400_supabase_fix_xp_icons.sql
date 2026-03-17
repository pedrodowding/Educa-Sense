-- Script de Correção de Ícones do Álbum e Seed de Dados XP
-- 1. Corrigir Ícones Inconsistentes
UPDATE album_items 
SET image_url = 'https://cdn-icons-png.flaticon.com/512/616/616553.png'
WHERE name = 'Ursinho Amigo';

UPDATE album_items 
SET image_url = 'https://cdn-icons-png.flaticon.com/512/616/616430.png'
WHERE name = 'Cachorrinho Feliz';

-- 2. Garantir que activity_completions tenha coluna XP
ALTER TABLE activity_completions ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 10;
ALTER TABLE activity_completions ADD COLUMN IF NOT EXISTS stars INTEGER DEFAULT 1;

-- 3. Atualizar registros antigos sem XP (assumindo 10XP por atividade)
UPDATE activity_completions SET xp = 10 WHERE xp IS NULL OR xp = 0;
