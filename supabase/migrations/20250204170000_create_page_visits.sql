-- Create page_visits table for analytics
CREATE TABLE IF NOT EXISTS public.page_visits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    page_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert page visits"
ON public.page_visits
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy to allow anon users to insert (optional, for public pages)
CREATE POLICY "Allow anon users to insert page visits"
ON public.page_visits
FOR INSERT
TO anon
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_page_visits_user_id ON public.page_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON public.page_visits(created_at);
