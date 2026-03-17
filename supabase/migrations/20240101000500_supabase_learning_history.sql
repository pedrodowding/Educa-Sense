-- Create learning_history table
CREATE TABLE IF NOT EXISTS public.learning_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    child_id uuid NULL, -- Optional link to specific child
    type text NOT NULL CHECK (type IN ('activity', 'drawing', 'creative_mission')),
    program text NULL, -- e.g., 'exercicio_facil', 'artes', 'leitura_guiada', 'missao_criativa'
    created_at timestamptz NOT NULL DEFAULT now(),
    score numeric NULL, -- 0 to 10 or percentage
    xp integer NOT NULL DEFAULT 0,
    duration_sec integer NULL,
    status text NULL, -- 'completed', 'blocked', 'skipped'
    title text NULL,
    summary text NULL,
    asset_url text NULL, -- URL for images/drawings
    result_json jsonb NULL, -- Detailed results, feedback, metadata
    
    CONSTRAINT learning_history_pkey PRIMARY KEY (id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_learning_history_user_date ON public.learning_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_history_user_type_date ON public.learning_history(user_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_history_child_date ON public.learning_history(child_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.learning_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own learning history"
    ON public.learning_history
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learning history"
    ON public.learning_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning history"
    ON public.learning_history
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own learning history"
    ON public.learning_history
    FOR DELETE
    USING (auth.uid() = user_id);

-- Storage Bucket for Drawings (if not exists)
-- Note: This usually requires manual setup in Supabase dashboard, but we include SQL for reference
INSERT INTO storage.buckets (id, name, public)
VALUES ('drawings', 'drawings', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access to Drawings"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'drawings' );

CREATE POLICY "Users can upload drawings"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'drawings' AND auth.uid() = owner );
