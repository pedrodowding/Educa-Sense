-- Add user_id column to children table linking to auth.users
ALTER TABLE children 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Ensure a user can only be linked to one child profile (1:1 relationship for student login)
ALTER TABLE children 
ADD CONSTRAINT children_user_id_key UNIQUE (user_id);
