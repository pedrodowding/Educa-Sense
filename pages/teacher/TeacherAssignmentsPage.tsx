
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { schoolService } from '../../services/schoolService';
import { SchoolClass, Assignment } from '../../types';
import { supabase } from '../../services/supabase';

const TeacherAssignmentsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [competency, setCompetency] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isRequired, setIsRequired] = useState(true);

  useEffect(() => {
    if (!user) return;
    schoolService.getMyAssignments(user.id).then(setAssignments);
    schoolService.getMyClasses(user.id).then(setClasses);
  }, [user]);

  const handleCreate = async () => {
    if (!user || !selectedClassId || !title) return;
    
    // Get schoolId from selected class
    const cls = classes.find(c => c.id === selectedClassId);
    if (!cls) return;

    const newAssign = await schoolService.createAssignment(cls.schoolId, user.id, selectedClassId, {
      title,
      competency,
      required: isRequired,
      dueDate: new Date(dueDate).toISOString()
    });

    if (newAssign) {
      setAssignments([newAssign, ...assignments]);
      setShowCreate(false);
      setTitle('');
      setCompetency('');
      setDueDate('');
    }
  };

  return (
    <div className="p-6 pb-20 max-w-4xl mx-auto">
      <header className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="size-10 rounded-full bg-gray-100 flex items-center justify-center">
           <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-2xl font-black">Tarefas</h1>
      </header>

      {!showCreate ? (
        <div className="space-y-6">
          <button 
            onClick={() => setShowCreate(true)}
            className="w-full py-4 bg-primary text-black font-black rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">add_task</span>
            Nova Tarefa
          </button>

          <div className="space-y-4">
            {assignments.map(assign => (
              <div key={assign.id} className="bg-white dark:bg-surface-dark p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-start mb-2">
                   <h3 className="font-black text-lg">{assign.title}</h3>
                   <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${assign.required ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                     {assign.required ? 'Obrigatória' : 'Extra'}
                   </span>
                </div>
                <p className="text-gray-500 text-sm mb-4">{assign.competency}</p>
                <div className="flex justify-between items-center text-xs text-gray-400 font-bold uppercase tracking-wider">
                   <span>Prazo: {new Date(assign.dueDate).toLocaleDateString()}</span>
                   <button className="text-blue-500 hover:underline">Ver Entregas</button>
                </div>
              </div>
            ))}
             {assignments.length === 0 && <p className="text-center text-gray-400">Nenhuma tarefa criada.</p>}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-dark p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
          <h2 className="text-xl font-black mb-4">Criar Tarefa</h2>
          
          <div>
            <label className="text-xs font-bold uppercase text-gray-400">Título</label>
            <input 
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-gray-50 p-3 rounded-xl border-none font-bold"
              placeholder="Ex: Exercícios de Fração"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-gray-400">Competência</label>
            <input 
              type="text" 
              value={competency}
              onChange={e => setCompetency(e.target.value)}
              className="w-full bg-gray-50 p-3 rounded-xl border-none"
              placeholder="Ex: Matemática - Números"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-gray-400">Turma</label>
            <select 
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full bg-gray-50 p-3 rounded-xl border-none font-bold"
            >
              <option value="">Selecione uma turma</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-gray-400">Prazo</label>
            <input 
              type="date" 
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full bg-gray-50 p-3 rounded-xl border-none font-bold"
            />
          </div>

          <div className="flex items-center gap-3">
             <input 
               type="checkbox" 
               checked={isRequired}
               onChange={e => setIsRequired(e.target.checked)}
               className="size-5 accent-primary"
             />
             <label className="font-bold text-sm">Obrigatória</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={() => setShowCreate(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Cancelar</button>
            <button onClick={handleCreate} className="flex-1 py-3 bg-primary text-black rounded-xl font-bold">Salvar e Enviar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAssignmentsPage;
