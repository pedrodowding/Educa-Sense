-- Migration para adicionar campos de assinatura na tabela profiles
-- Data: 2026-01-04
-- Objetivo: Suportar integração com Mercado Pago e status de assinatura PRO

DO $$ 
BEGIN 
    -- Adicionar subscription_tier se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_tier') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_tier text DEFAULT 'free';
    END IF;

    -- Adicionar subscription_status se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_status') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_status text DEFAULT 'inactive';
    END IF;

    -- Adicionar subscription_provider se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_provider') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_provider text DEFAULT 'mercadopago';
    END IF;

    -- Adicionar subscription_preference_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_preference_id') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_preference_id text;
    END IF;

    -- Adicionar subscription_payment_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_payment_id') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_payment_id text;
    END IF;

    -- Adicionar subscription_activated_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_activated_at') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_activated_at timestamptz;
    END IF;

    -- Adicionar subscription_updated_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_updated_at') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_updated_at timestamptz;
    END IF;
END $$;

-- Criar índice para buscas rápidas por status se necessário (opcional mas recomendado)
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
