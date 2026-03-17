-- CRIAÇÃO DA TABELA DE DISPOSITIVOS CONECTADOS
-- Rode este script no Editor SQL do Supabase para corrigir o erro 404

CREATE TABLE IF NOT EXISTS public.child_devices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  info JSONB DEFAULT '{}'::jsonb,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(child_id, device_id)
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.child_devices ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (Policies)
CREATE POLICY "Guardians can view their children's devices" ON public.child_devices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.children WHERE children.id = child_devices.child_id AND children.guardian_id = auth.uid())
  );

CREATE POLICY "Guardians can manage their children's devices" ON public.child_devices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.children WHERE children.id = child_devices.child_id AND children.guardian_id = auth.uid())
  );

-- Função RPC para registrar dispositivo (usada pelo login do aluno)
CREATE OR REPLACE FUNCTION public.register_child_device(
  p_access_code TEXT,
  p_device_id TEXT,
  p_info JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_child children%ROWTYPE;
  v_device child_devices%ROWTYPE;
BEGIN
  SELECT * INTO v_child
  FROM public.children
  WHERE access_code = p_access_code
  LIMIT 1;

  IF v_child.id IS NULL THEN
    RAISE EXCEPTION 'Código inválido';
  END IF;

  INSERT INTO public.child_devices (child_id, device_id, info, last_seen)
  VALUES (v_child.id, p_device_id, COALESCE(p_info, '{}'::jsonb), NOW())
  ON CONFLICT (child_id, device_id)
  DO UPDATE SET info = EXCLUDED.info, last_seen = NOW()
  RETURNING * INTO v_device;

  RETURN jsonb_build_object(
    'child', jsonb_build_object(
      'id', v_child.id,
      'name', v_child.name,
      'age', v_child.age,
      'grade', v_child.grade,
      'avatar', v_child.avatar,
      'access_code', v_child.access_code,
      'xp', v_child.xp,
      'stars', v_child.stars,
      'streak', v_child.streak,
      'difficulty_subjects', v_child.difficulty_subjects
    ),
    'device', jsonb_build_object(
      'id', v_device.id,
      'device_id', v_device.device_id,
      'info', v_device.info,
      'last_seen', v_device.last_seen,
      'created_at', v_device.created_at
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_child_device(TEXT, TEXT, JSONB) TO anon, authenticated;
