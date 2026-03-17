-- Tabela de Convites Internos da Escola
CREATE TABLE IF NOT EXISTS school_invitations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    invited_identifier TEXT NOT NULL, -- Email ou identificador interno
    role TEXT NOT NULL CHECK (role IN ('director', 'teacher')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'canceled')) DEFAULT 'pending',
    invite_code TEXT NOT NULL UNIQUE,
    created_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    
    -- Evita duplicidade de convite pendente para mesmo identificador na mesma escola
    CONSTRAINT unique_pending_invite UNIQUE NULLS NOT DISTINCT (school_id, invited_identifier, status)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_school_invite 
ON school_invitations (school_id, invited_identifier) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_school_invitations_code ON school_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_school_invitations_school ON school_invitations(school_id);

-- RLS
ALTER TABLE school_invitations ENABLE ROW LEVEL SECURITY;

-- Diretor vê e gerencia convites da sua escola
CREATE POLICY "Director manages school invitations" ON school_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM school_members 
            WHERE school_members.school_id = school_invitations.school_id 
            AND school_members.user_id = auth.uid() 
            AND role = 'director'
        )
    );

-- Qualquer usuário autenticado pode ler um convite se tiver o código (para aceitar)
CREATE POLICY "Users can view invitation by code" ON school_invitations
    FOR SELECT USING (
        auth.role() = 'authenticated' -- Qualquer auth pode tentar validar código
    );

-- RPC para aceitar convite
CREATE OR REPLACE FUNCTION rpc_accept_school_invitation(
    p_invite_code TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_invite RECORD;
    v_user_id UUID;
    v_existing_member_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- 1. Buscar convite
    SELECT * INTO v_invite 
    FROM school_invitations 
    WHERE invite_code = p_invite_code 
    AND status = 'pending';

    IF v_invite IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_OR_EXPIRED_CODE');
    END IF;

    -- 2. Verificar se já é membro
    SELECT id INTO v_existing_member_id
    FROM school_members
    WHERE school_id = v_invite.school_id AND user_id = v_user_id;

    IF v_existing_member_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ALREADY_MEMBER');
    END IF;

    -- 3. Inserir membro
    INSERT INTO school_members (school_id, user_id, role)
    VALUES (v_invite.school_id, v_user_id, v_invite.role);

    -- 4. Atualizar convite
    UPDATE school_invitations
    SET status = 'accepted', responded_at = NOW()
    WHERE id = v_invite.id;

    RETURN jsonb_build_object('success', true, 'schoolId', v_invite.school_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
