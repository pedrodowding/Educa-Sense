import { supabase } from './supabase';
import { ClassGroup, Child } from '../types';

export const fetchTeacherClassrooms = async (teacherId: string): Promise<ClassGroup[]> => {
  const { data, error } = await supabase
    .from('classrooms')
    .select(`
      *,
      classroom_students (count)
    `)
    .eq('teacher_id', teacherId);

  if (error) {
    console.error('Error fetching classrooms:', error);
    return [];
  }

  // Calculate engagement mock or real if we have logs
  // For now returning mock engagement
  return data.map((c: any) => ({
    id: c.id,
    name: c.name,
    grade: c.grade,
    studentCount: c.classroom_students[0]?.count || 0,
    engagement: Math.floor(Math.random() * 20) + 80 // Mock 80-100%
  }));
};

export const createClassroom = async (teacherId: string, name: string, grade: string) => {
  const { data, error } = await supabase
    .from('classrooms')
    .insert({ teacher_id: teacherId, name, grade })
    .select()
    .single();

  if (error) {
    console.error('Error creating classroom:', error);
    return null;
  }
  return data;
};

export const fetchClassroomStudents = async (classroomId: string): Promise<Child[]> => {
  const { data, error } = await supabase
    .from('classroom_students')
    .select(`
      child_id,
      children (*)
    `)
    .eq('classroom_id', classroomId);

  if (error) {
    console.error('Error fetching students:', error);
    return [];
  }

  return data.map((row: any) => row.children);
};

export const addStudentToClassroom = async (classroomId: string, childId: string) => {
  const { error } = await supabase
    .from('classroom_students')
    .insert({ classroom_id: classroomId, child_id: childId });

  if (error) {
    console.error('Error adding student:', error);
    return false;
  }
  return true;
};
