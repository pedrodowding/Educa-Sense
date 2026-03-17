import { supabase } from './supabase';
import { 
  School, SchoolMember, SchoolClass, SchoolStudent, 
  Assignment, AssignmentRecipient, ActivityEvent 
} from '../types';

export const schoolService = {
  // --- DIRECTOR ---
  
  async createSchool(name: string): Promise<School | null> {
    const { data, error } = await supabase
      .from('schools')
      .insert({ name })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating school:', error);
      return null;
    }
    return mapSchool(data);
  },

  async addMember(schoolId: string, userId: string, role: 'director' | 'teacher'): Promise<SchoolMember | null> {
    const { data, error } = await supabase
      .from('school_members')
      .insert({ school_id: schoolId, user_id: userId, role })
      .select()
      .single();
      
    if (error) {
      console.error('Error adding member:', error);
      return null;
    }
    return mapMember(data);
  },

  // --- INTERNAL INVITATIONS ---

  async createSchoolInvitation(schoolId: string, identifier: string, role: 'director' | 'teacher'): Promise<{ success: boolean; code?: string; error?: string }> {
    try {
      // Gerar código simples de 8 caracteres
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { data, error } = await supabase
        .from('school_invitations')
        .insert({
            school_id: schoolId,
            invited_identifier: identifier,
            role: role,
            invite_code: code,
            status: 'pending'
        })
        .select('invite_code')
        .single();

      if (error) throw error;
      return { success: true, code: data.invite_code };
    } catch (err: any) {
      console.error('Error creating invitation:', err);
      return { success: false, error: err.message };
    }
  },

  async getSchoolInvitations(schoolId: string) {
    const { data, error } = await supabase
      .from('school_invitations')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  },

  async acceptSchoolInvitation(code: string): Promise<{ success: boolean; schoolId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('rpc_accept_school_invitation', {
        p_invite_code: code.trim().toUpperCase()
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);
      
      return { success: true, schoolId: data.schoolId };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
  },

  async cancelInvitation(inviteId: string) {
      const { error } = await supabase
        .from('school_invitations')
        .update({ status: 'canceled' })
        .eq('id', inviteId);
        
      if (error) throw error;
  },

  async getSchoolMembers(schoolId: string, role?: 'director' | 'teacher'): Promise<SchoolMember[]> {
    let query = supabase.from('school_members').select('*').eq('school_id', schoolId);
    if (role) query = query.eq('role', role);
    
    const { data, error } = await query;
    if (error) throw error;
    return data.map(mapMember);
  },

  async getMySchool(userId: string, role: 'director' | 'teacher'): Promise<{ schoolId: string } | null> {
    const { data, error } = await supabase
      .from('school_members')
      .select('school_id')
      .eq('user_id', userId)
      .eq('role', role)
      .single();
    
    if (error || !data) return null;
    return { schoolId: data.school_id };
  },

  async getSchoolStats(schoolId: string) {
    // This would ideally be a specialized RPC or multiple queries
    // MVP: simple counts
    const { count: teachers } = await supabase.from('school_members').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'teacher');
    const { count: students } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId);
    
    // Mock engagement for MVP
    return { teachers: teachers || 0, students: students || 0, engagement: 85 };
  },

  // --- TEACHER ---

  async createClass(schoolId: string, teacherId: string, name: string): Promise<SchoolClass | null> {
    const { data, error } = await supabase
      .from('classes')
      .insert({ school_id: schoolId, teacher_user_id: teacherId, name })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating class:', error);
      return null;
    }
    return mapClass(data);
  },

  async getMyClasses(teacherId: string): Promise<SchoolClass[]> {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_user_id', teacherId);
    
    if (error) throw error;
    return data.map(mapClass);
  },

  async createStudent(schoolId: string, name: string, classId: string, childId?: string): Promise<SchoolStudent | null> {
    // 1. Create Student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({ school_id: schoolId, name, child_id: childId })
      .select()
      .single();

    if (studentError) {
      console.error('Error creating student:', studentError);
      return null;
    }

    // 2. Link to Class
    const { error: linkError } = await supabase
      .from('class_students')
      .insert({ class_id: classId, student_id: student.id });

    if (linkError) {
      console.error('Error linking student to class:', linkError);
      // Should rollback student creation ideally
      return null;
    }

    return mapStudent(student);
  },

  async getStudentsInClass(classId: string): Promise<SchoolStudent[]> {
    const { data, error } = await supabase
      .from('class_students')
      .select('student:students(*)')
      .eq('class_id', classId);

    if (error) throw error;
    return data.map((d: any) => mapStudent(d.student));
  },

  async createAssignment(
    schoolId: string, 
    teacherId: string, 
    classId: string, 
    assignment: Omit<Assignment, 'id' | 'createdAt' | 'schoolId' | 'teacherUserId' | 'classId'>
  ): Promise<Assignment | null> {
    
    const { data, error } = await supabase
      .from('assignments')
      .insert({
        school_id: schoolId,
        teacher_user_id: teacherId,
        class_id: classId,
        title: assignment.title,
        competency: assignment.competency,
        required: assignment.required,
        due_date: assignment.dueDate
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating assignment:', error);
      return null;
    }

    // Distribute to all students in class
    const students = await this.getStudentsInClass(classId);
    if (students.length > 0) {
      const recipients = students.map(s => ({
        assignment_id: data.id,
        student_id: s.id,
        status: 'pending'
      }));
      
      const { error: distError } = await supabase.from('assignment_recipients').insert(recipients);
      if (distError) console.error('Error distributing assignment:', distError);
    }

    return mapAssignment(data);
  },

  async getMyAssignments(teacherId: string): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('teacher_user_id', teacherId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(mapAssignment);
  },

  async getAssignmentStats(assignmentId: string) {
    const { data, error } = await supabase
      .from('assignment_recipients')
      .select('status, score, student:students(name)');

    if (error) throw error;
    
    const total = data.length;
    const submitted = data.filter((r: any) => r.status === 'submitted').length;
    const late = data.filter((r: any) => r.status === 'late').length;
    
    return {
      total,
      submitted,
      late,
      recipients: data.map((r: any) => ({
        studentName: r.student.name,
        status: r.status,
        score: r.score
      }))
    };
  },

  // --- STUDENT ---
  
  async getStudentAssignments(childId: string): Promise<(Assignment & { status: string, score?: number, recipientId: string })[]> {
    // 1. Find student record for this child
    const { data: students, error: sError } = await supabase
      .from('students')
      .select('id')
      .eq('child_id', childId);

    if (sError || !students.length) return [];

    const studentIds = students.map(s => s.id);

    // 2. Find assignments
    const { data, error } = await supabase
      .from('assignment_recipients')
      .select(`
        id, status, score,
        assignment:assignments(*)
      `)
      .in('student_id', studentIds)
      .neq('status', 'submitted'); // Optional: filter only pending? Prompt says "Lista de tarefas".

    if (error) throw error;

    return data.map((r: any) => ({
      ...mapAssignment(r.assignment),
      status: r.status,
      score: r.score,
      recipientId: r.id
    }));
  },

  async submitAssignment(recipientId: string, score: number | null): Promise<void> {
    // 1. Update recipient
    const { data: recipient, error } = await supabase
      .from('assignment_recipients')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        score: score
      })
      .eq('id', recipientId)
      .select('student_id, assignment:assignments(competency)')
      .single();

    if (error) throw error;

    // 2. Log Activity Event (Canonical History)
    if (recipient && recipient.assignment) {
      const competency = Array.isArray(recipient.assignment) 
        ? recipient.assignment[0]?.competency 
        : (recipient.assignment as any).competency;

      if (competency) {
        await supabase.from('activity_events').insert({
          student_id: recipient.student_id,
          competency: competency,
          activity_type: 'assignment',
          score: score,
          source: 'assignment',
          assignment_recipient_id: recipientId
        });
      }
    }
  },

  // --- BULLETIN BOARD (MURAL) ---

  async createBulletinPost(
    schoolId: string,
    authorUserId: string,
    post: { title: string; content: string; type: string; classId?: string }
  ) {
    const { data, error } = await supabase
      .from('school_bulletin_posts')
      .insert({
        school_id: schoolId,
        author_user_id: authorUserId,
        title: post.title,
        content: post.content,
        type: post.type,
        class_id: post.classId || null
      })
      .select()
      .single();

    if (error) throw error;

    // Audit Log
    await this.logBulletinAction({
      schoolId,
      userId: authorUserId,
      action: 'create',
      postId: data.id,
      details: { title: post.title, type: post.type }
    });

    return data;
  },

  async deleteBulletinPost(postId: string, schoolId: string, userId: string) {
    const { error } = await supabase
      .from('school_bulletin_posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;

    // Audit Log
    await this.logBulletinAction({
      schoolId,
      userId,
      action: 'delete',
      postId,
      details: {}
    });
  },

  async togglePinBulletinPost(postId: string, isPinned: boolean, schoolId: string, userId: string) {
    const { error } = await supabase
      .from('school_bulletin_posts')
      .update({ pinned: isPinned })
      .eq('id', postId);

    if (error) throw error;

    // Audit Log
    await this.logBulletinAction({
      schoolId,
      userId,
      action: isPinned ? 'pin' : 'unpin',
      postId,
      details: { pinned: isPinned }
    });
  },

  async getBulletinLogs(schoolId: string) {
    const { data, error } = await supabase
      .from('school_bulletin_logs')
      .select(`
        *,
        user:user_id (email)
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    
    return data.map((d: any) => ({
      id: d.id,
      schoolId: d.school_id,
      postId: d.post_id,
      userId: d.user_id,
      action: d.action,
      details: d.details,
      createdAt: d.created_at,
      userName: d.user?.email
    }));
  },

  async logBulletinAction(log: { schoolId: string, userId: string, action: string, postId?: string, details: any }) {
    await supabase.from('school_bulletin_logs').insert({
      school_id: log.schoolId,
      user_id: log.userId,
      action: log.action,
      post_id: log.postId,
      details: log.details
    });
  },

  async getBulletinPosts(schoolId: string, classId?: string) {
    let query = supabase
      .from('school_bulletin_posts')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    // Se classId for fornecido, pega posts dessa turma ESPECÍFICA + posts GERAIS (class_id is null)
    if (classId) {
      query = query.or(`class_id.eq.${classId},class_id.is.null`);
    } else {
      // Se não, pega apenas os gerais (para visão da escola) ou implementa filtro customizado
      // Aqui vamos assumir: visão do diretor vê tudo, ou visão geral vê só globais.
      // Simplificação: sem classId retorna TUDO da escola (visão diretor)
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return data.map((d: any) => ({
      id: d.id,
      schoolId: d.school_id,
      authorUserId: d.author_user_id,
      classId: d.class_id,
      title: d.title,
      content: d.content,
      type: d.type,
      pinned: d.pinned,
      createdAt: d.created_at
    }));
  },

  // --- BULK IMPORT ---

  async processBulkImport(
    schoolId: string, 
    userId: string, 
    filename: string,
    rows: Array<{ studentName: string; className: string; grade: string }>
  ) {
    // 1. Create Log Entry
    const { data: logData, error: logError } = await supabase
      .from('school_import_logs')
      .insert({
        school_id: schoolId,
        user_id: userId,
        filename: filename,
        status: 'processing',
        total_records: rows.length
      })
      .select()
      .single();

    if (logError) throw logError;
    const logId = logData.id;
    
    let processed = 0;
    const errors: any[] = [];
    const classCache: Record<string, string> = {}; // Name -> ID

    // 2. Process Rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.studentName || !row.className) {
          throw new Error('Nome do aluno e Turma são obrigatórios');
        }

        // A. Resolve Class
        let classId = classCache[row.className];
        if (!classId) {
          // Check if exists
          const { data: existingClass } = await supabase
            .from('classes')
            .select('id')
            .eq('school_id', schoolId)
            .eq('name', row.className)
            .single();
          
          if (existingClass) {
            classId = existingClass.id;
          } else {
            // Create new class
            const { data: newClass, error: classError } = await supabase
              .from('classes')
              .insert({
                school_id: schoolId,
                teacher_user_id: userId, // Director owns it initially
                name: row.className,
                grade: row.grade || 'Multi'
              })
              .select()
              .single();
            
            if (classError) throw classError;
            classId = newClass.id;
          }
          classCache[row.className] = classId;
        }

        // B. Create Student
        await this.createStudent(schoolId, row.studentName, classId);
        processed++;

      } catch (err: any) {
        console.error(`Error importing row ${i + 1}:`, err);
        errors.push({ row: i + 1, error: err.message, data: row });
      }
    }

    // 3. Update Log
    await supabase
      .from('school_import_logs')
      .update({
        status: errors.length === rows.length ? 'failed' : 'completed',
        processed_records: processed,
        error_log: errors
      })
      .eq('id', logId);

    return { processed, errors };
  },

  async getSchoolInfoForChild(childId: string) {
    // Busca informações da escola e turma para um filho (vinculado via child_id)
    const { data, error } = await supabase
      .from('students')
      .select(`
        school_id,
        class_students (
          class_id
        )
      `)
      .eq('child_id', childId)
      .single();

    if (error || !data) return null;

    // Pega a primeira turma encontrada (assumindo 1 turma por escola por enquanto)
    const classId = data.class_students?.[0]?.class_id;

    return {
      schoolId: data.school_id,
      classId: classId
    };
  }
};

// Mappers
const mapSchool = (d: any): School => ({ id: d.id, name: d.name, createdAt: d.created_at });
const mapMember = (d: any): SchoolMember => ({ id: d.id, schoolId: d.school_id, userId: d.user_id, role: d.role, createdAt: d.created_at });
const mapClass = (d: any): SchoolClass => ({ id: d.id, schoolId: d.school_id, teacherUserId: d.teacher_user_id, name: d.name, createdAt: d.created_at });
const mapStudent = (d: any): SchoolStudent => ({ id: d.id, schoolId: d.school_id, name: d.name, active: d.active, childId: d.child_id, createdAt: d.created_at });
const mapAssignment = (d: any): Assignment => ({ id: d.id, schoolId: d.school_id, teacherUserId: d.teacher_user_id, classId: d.class_id, title: d.title, competency: d.competency, required: d.required, dueDate: d.due_date, createdAt: d.created_at });