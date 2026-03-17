-- Sprint 8A: Student Story Book
-- Description: Create table for persistent stories (The Book)

CREATE TABLE IF NOT EXISTS public.child_stories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- The full story text
    cover_image TEXT, -- Optional URL for cover/illustration
    theme TEXT, -- e.g. 'Amizade', 'Coragem'
    metadata JSONB DEFAULT '{}'::jsonb, -- Store choices (hero, scenario, etc)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_child_stories_child_created ON public.child_stories(child_id, created_at DESC);

-- RLS
ALTER TABLE public.child_stories ENABLE ROW LEVEL SECURITY;

-- Guardians can view/manage their children's stories
CREATE POLICY "Guardians can view their children's stories" ON public.child_stories
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.children WHERE children.id = child_stories.child_id AND children.guardian_id = auth.uid())
  );

CREATE POLICY "Guardians can insert stories for their children" ON public.child_stories
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.children WHERE children.id = child_stories.child_id AND children.guardian_id = auth.uid())
  );

CREATE POLICY "Guardians can delete their children's stories" ON public.child_stories
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.children WHERE children.id = child_stories.child_id AND children.guardian_id = auth.uid())
  );

-- Reload Schema
NOTIFY pgrst, 'reload schema';
