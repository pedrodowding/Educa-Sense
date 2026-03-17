-- Sprint 8B: Game Reward Configuration
-- Description: Add columns for Game Time control

ALTER TABLE public.children 
ADD COLUMN IF NOT EXISTS game_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS game_time_limit INTEGER DEFAULT 5; -- Minutes (5, 10, 15, 20)

-- Audit Log support for game settings changes handled by existing child_updated action
-- No new RPC needed as we use direct update in useChildren hook for generic fields
-- or we can extend the update function.

NOTIFY pgrst, 'reload schema';
