-- ESCOLA (SCHOOLS)
CREATE TABLE IF NOT EXISTS schools (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MEMBROS DA ESCOLA (SCHOOL_MEMBERS)
CREATE TABLE IF NOT EXISTS school_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('director', 'teacher')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, user_id)
);

-- TURMAS (CLASSES)
CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  teacher_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ALUNOS (STUDENTS)
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE,
  -- Link opcional para a tabela children existente para login
  child_id UUID REFERENCES children(id) ON DELETE SET NULL
);

-- ALUNOS DA TURMA (CLASS_STUDENTS)
CREATE TABLE IF NOT EXISTS class_students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE(class_id, student_id)
);

-- TAREFAS (ASSIGNMENTS)
CREATE TABLE IF NOT EXISTS assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  teacher_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  competency TEXT,
  required BOOLEAN DEFAULT FALSE,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DESTINATÁRIOS DA TAREFA (ASSIGNMENT_RECIPIENTS)
CREATE TABLE IF NOT EXISTS assignment_recipients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'submitted', 'late')) DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE,
  score NUMERIC,
  UNIQUE(assignment_id, student_id)
);

-- HISTÓRICO CANÔNICO (ACTIVITY_EVENTS)
CREATE TABLE IF NOT EXISTS activity_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  competency TEXT,
  activity_type TEXT,
  score NUMERIC,
  source TEXT CHECK (source IN ('free_practice', 'assignment')),
  assignment_recipient_id UUID REFERENCES assignment_recipients(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- RLS POLICIES

-- Enable RLS on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

-- SCHOOLS
DROP POLICY IF EXISTS "Director sees their school" ON schools;
CREATE POLICY "Director sees their school" ON schools
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM school_members WHERE school_members.school_id = schools.id AND school_members.user_id = auth.uid() AND role = 'director')
  );

DROP POLICY IF EXISTS "Teacher sees their school" ON schools;
CREATE POLICY "Teacher sees their school" ON schools
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM school_members WHERE school_members.school_id = schools.id AND school_members.user_id = auth.uid() AND role = 'teacher')
  );

-- SCHOOL_MEMBERS
DROP POLICY IF EXISTS "User sees schools they participate in" ON school_members;
CREATE POLICY "User sees schools they participate in" ON school_members
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Director manages members" ON school_members;
CREATE POLICY "Director manages members" ON school_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM school_members sm WHERE sm.school_id = school_members.school_id AND sm.user_id = auth.uid() AND sm.role = 'director')
  );

-- CLASSES
DROP POLICY IF EXISTS "Teacher sees own classes" ON classes;
CREATE POLICY "Teacher sees own classes" ON classes
  FOR ALL USING (teacher_user_id = auth.uid());

DROP POLICY IF EXISTS "Director sees all classes" ON classes;
CREATE POLICY "Director sees all classes" ON classes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM school_members WHERE school_members.school_id = classes.school_id AND school_members.user_id = auth.uid() AND role = 'director')
  );

-- STUDENTS
DROP POLICY IF EXISTS "Teacher sees linked students" ON students;
CREATE POLICY "Teacher sees linked students" ON students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_students cs
      JOIN classes c ON cs.class_id = c.id
      WHERE cs.student_id = students.id AND c.teacher_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Director sees all students" ON students;
CREATE POLICY "Director sees all students" ON students
  FOR ALL USING (
    EXISTS (SELECT 1 FROM school_members WHERE school_members.school_id = students.school_id AND school_members.user_id = auth.uid() AND role = 'director')
  );

DROP POLICY IF EXISTS "Teacher can create students" ON students;
CREATE POLICY "Teacher can create students" ON students
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM school_members WHERE school_members.school_id = students.school_id AND school_members.user_id = auth.uid() AND role = 'teacher')
  );

-- CLASS_STUDENTS
DROP POLICY IF EXISTS "Teacher manages class students" ON class_students;
CREATE POLICY "Teacher manages class students" ON class_students
  FOR ALL USING (
    EXISTS (SELECT 1 FROM classes WHERE classes.id = class_students.class_id AND classes.teacher_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Director sees class students" ON class_students;
CREATE POLICY "Director sees class students" ON class_students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes c 
      JOIN school_members sm ON c.school_id = sm.school_id
      WHERE c.id = class_students.class_id AND sm.user_id = auth.uid() AND sm.role = 'director'
    )
  );

-- ASSIGNMENTS
DROP POLICY IF EXISTS "Teacher sees own assignments" ON assignments;
CREATE POLICY "Teacher sees own assignments" ON assignments
  FOR ALL USING (teacher_user_id = auth.uid());

DROP POLICY IF EXISTS "Director sees all assignments" ON assignments;
CREATE POLICY "Director sees all assignments" ON assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM school_members WHERE school_members.school_id = assignments.school_id AND school_members.user_id = auth.uid() AND role = 'director')
  );

DROP POLICY IF EXISTS "Students see their assignments" ON assignments;
CREATE POLICY "Students see their assignments" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignment_recipients ar
      JOIN students s ON ar.student_id = s.id
      WHERE ar.assignment_id = assignments.id 
      AND (s.child_id IS NOT NULL AND EXISTS (SELECT 1 FROM children WHERE children.id = s.child_id AND children.guardian_id = auth.uid())) 
    )
  );

-- ASSIGNMENT_RECIPIENTS
DROP POLICY IF EXISTS "Teacher manages recipients" ON assignment_recipients;
CREATE POLICY "Teacher manages recipients" ON assignment_recipients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = assignment_recipients.assignment_id AND a.teacher_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Director sees recipients" ON assignment_recipients;
CREATE POLICY "Director sees recipients" ON assignment_recipients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN school_members sm ON a.school_id = sm.school_id
      WHERE a.id = assignment_recipients.assignment_id AND sm.user_id = auth.uid() AND sm.role = 'director'
    )
  );

DROP POLICY IF EXISTS "Students see own recipient records" ON assignment_recipients;
CREATE POLICY "Students see own recipient records" ON assignment_recipients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = assignment_recipients.student_id
      AND (
         EXISTS (SELECT 1 FROM children WHERE children.id = s.child_id AND children.guardian_id = auth.uid())
      )
    )
  );

-- ACTIVITY_EVENTS
DROP POLICY IF EXISTS "Teacher sees student events" ON activity_events;
CREATE POLICY "Teacher sees student events" ON activity_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_students cs
      JOIN classes c ON cs.class_id = c.id
      WHERE cs.student_id = activity_events.student_id AND c.teacher_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Director sees all events" ON activity_events;
CREATE POLICY "Director sees all events" ON activity_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN school_members sm ON s.school_id = sm.school_id
      WHERE s.id = activity_events.student_id AND sm.user_id = auth.uid() AND sm.role = 'director'
    )
  );

DROP POLICY IF EXISTS "Students create own events" ON activity_events;
CREATE POLICY "Students create own events" ON activity_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = activity_events.student_id
      AND EXISTS (SELECT 1 FROM children WHERE children.id = s.child_id AND children.guardian_id = auth.uid())
    )
  );
