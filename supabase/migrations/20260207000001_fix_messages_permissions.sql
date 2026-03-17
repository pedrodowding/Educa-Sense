
-- Garantir permissões para role 'anon' (Student Mode)
GRANT SELECT, INSERT, UPDATE ON public.messages TO anon;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO service_role;

-- Notificar schema reload
NOTIFY pgrst, 'reload schema';
