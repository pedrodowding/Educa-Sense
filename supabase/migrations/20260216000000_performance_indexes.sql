-- Create indexes for frequently queried foreign keys to prevent sequential scans during RLS checks
CREATE INDEX IF NOT EXISTS idx_children_guardian_id ON public.children(guardian_id);
CREATE INDEX IF NOT EXISTS idx_children_user_id ON public.children(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_child_id ON public.exercises(child_id);
