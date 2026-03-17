
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { schoolService } from '../../services/schoolService';
import { SchoolClass, SchoolStudent } from '../../types';
import { supabase } from '../../services/supabase';

const TeacherClassesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newStudentName, setNewStudentName] = useState('');

  useEffect(() => {
    fetchClasses();
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents(selectedClass.id);
    } else {
      setStudents([]);
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    if (!user) return;
    try {
      const data = await schoolService.getMyClasses(user.id);
      setClasses(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchStudents = async (classId: string) => {
    try {
      const data = await schoolService.getStudentsInClass(classId);
      setStudents(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateClass = async () => {
    if (!user || !newClassName) return;
    // Need schoolId. For MVP, assume user belongs to one school.
    // Let's fetch it first or rely on a "getMySchool" logic.
    // For now, I'll fetch it ad-hoc.
    const { data: membership } = await supabase.from('school_members').select('school_id').eq('user_id', user.id).eq('role', 'teacher').single();
    if (!membership) return alert('Você não está vinculado a uma escola.');

    const newClass = await schoolService.createClass(membership.school_id, user.id, newClassName);
    if (newClass) {
      setClasses([...classes, newClass]);
      setNewClassName('');
      setShowCreateModal(false);
    }
  };

  const handleAddStudent = async () => {
    if (!selectedClass || !newStudentName) return;
    // Check limit 50
    if (students.length >= 50) return alert('Limite de 50 alunos atingido (MVP).');

    const newStudent = await schoolService.createStudent(selectedClass.schoolId, newStudentName, selectedClass.id);
    if (newStudent) {
      setStudents([...students, newStudent]);
      setNewStudentName('');
    }
  };

  return (
    <div className="p-6 pb-20 max-w-4xl mx-auto">
      <header className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="size-10 rounded-full bg-gray-100 flex items-center justify-center">
           <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-2xl font-black">Gerenciar Turmas</h1>
      </header>

      {!selectedClass ? (
        <div className="space-y-6">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="w-full py-4 bg-primary text-black font-black rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">add</span>
            Criar Nova Turma
          </button>

          <div className="grid gap-4">
            {classes.map(cls => (
              <button 
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className="bg-white dark:bg-surface-dark p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 text-left hover:border-primary transition-colors"
              >
                <h3 className="font-black text-lg">{cls.name}</h3>
                <p className="text-gray-500 text-sm">Clique para ver alunos</p>
              </button>
            ))}
             {classes.length === 0 && <p className="text-center text-gray-400">Nenhuma turma encontrada.</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{selectedClass.name}</h2>
            <button onClick={() => setSelectedClass(null)} className="text-sm text-blue-500 font-bold">Trocar Turma</button>
          </div>

          <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="font-bold mb-4">Adicionar Aluno</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newStudentName}
                onChange={e => setNewStudentName(e.target.value)}
                placeholder="Nome do aluno"
                className="flex-1 bg-gray-50 p-3 rounded-xl border-none"
              />
              <button onClick={handleAddStudent} className="bg-green-500 text-white px-4 rounded-xl font-bold">
                Adicionar
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-gray-500 text-sm uppercase">Lista de Alunos ({students.length})</h3>
            {students.map(student => (
              <div key={student.id} className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <span className="font-bold">{student.name}</span>
                <span className={`text-[10px] font-bold px-2 py-1 rounded ${student.active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {student.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            ))}
             {students.length === 0 && <p className="text-gray-400 text-sm">Nenhum aluno nesta turma.</p>}
          </div>
        </div>
      )}

      {/* Modal Criar Turma */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-dark w-full max-w-sm p-6 rounded-3xl">
            <h3 className="font-black text-xl mb-4">Nova Turma</h3>
            <input 
              type="text" 
              value={newClassName}
              onChange={e => setNewClassName(e.target.value)}
              placeholder="Nome da turma (ex: 3º Ano B)"
              className="w-full bg-gray-50 p-4 rounded-xl border-none mb-6 font-bold"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Cancelar</button>
              <button onClick={handleCreateClass} className="flex-1 py-3 bg-primary text-black rounded-xl font-bold">Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherClassesPage;
