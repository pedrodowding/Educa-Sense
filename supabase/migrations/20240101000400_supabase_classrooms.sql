-- Classrooms Table
CREATE TABLE classrooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classroom Students (Many-to-Many: Child <-> Classroom)
CREATE TABLE classroom_students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(classroom_id, child_id)
);

-- RLS
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_students ENABLE ROW LEVEL SECURITY;

-- Policies for Classrooms
CREATE POLICY "Teachers can manage their classrooms" ON classrooms
  FOR ALL USING (auth.uid() = teacher_id);

CREATE POLICY "Students (Children) can view classrooms they are in" ON classrooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classroom_students 
      WHERE classroom_students.classroom_id = classrooms.id 
      AND classroom_students.child_id IN (
        SELECT id FROM children WHERE guardian_id = auth.uid() -- This assumes Guardian acts for Child. 
        -- If Children have own auth, this needs adjustment. 
        -- Current model: Guardian owns Children.
      )
    )
  );

-- Policies for Classroom Students
CREATE POLICY "Teachers can manage students in their classrooms" ON classroom_students
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classrooms 
      WHERE classrooms.id = classroom_students.classroom_id 
      AND classrooms.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Guardians can view which classrooms their children are in" ON classroom_students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM children 
      WHERE children.id = classroom_students.child_id 
      AND children.guardian_id = auth.uid()
    )
  );
