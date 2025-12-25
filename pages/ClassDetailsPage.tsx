
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClassGroup, Child, Exercise } from '../types';

interface Props {
  classes: ClassGroup[];
  children: Child[];
  history: Exercise[];
}

const ClassDetailsPage: React.FC<Props> = ({ classes, children, history }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const classGroup = classes.find(c => c.id === id);
  
  // Simulação de alunos da turma (no MVP usamos os alunos globais filtrados pela série)
  const students = children.filter(c => c.grade === classGroup?.grade);

  if (!classGroup) return null;

  return (
    <div className="flex flex-col min-h-full pb-20 bg-gray-50 dark:bg-background-dark">
      <header className="p-6 pt-10 flex items-center justify-between bg-white dark:bg-surface-dark border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => navigate(-1)} className="size-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="text-center">
           <h2 className="text-lg font-black">{classGroup.name}</h2>
           <p className="text-[10px] font-black uppercase text-text-sub tracking-widest">{classGroup.grade}</p>
        </div>
        <button className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </header>

      <main className="p-6 space-y-8">
        {/* Painel de Engajamento da Turma */}
        <section className="bg-white dark:bg-surface-dark p-6 rounded-[40px] shadow-soft flex items-center justify-between">
           <div className="space-y-1">
              <p className="text-[10px] font-black text-text-sub uppercase tracking-widest">Frequência da Turma</p>
              <h3 className="text-2xl font-black">Muito Alta</h3>
              <p className="text-xs text-primary font-bold">+12% vs mês anterior</p>
           </div>
           <div className="size-20 relative">
              <svg viewBox="0 0 36 36" className="size-full">
                <path className="stroke-gray-100 dark:stroke-gray-800" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="stroke-primary" strokeWidth="3" strokeDasharray={`${classGroup.engagement}, 100`} fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-black text-sm">{classGroup.engagement}%</div>
           </div>
        </section>

        {/* Lista de Alunos */}
        <section className="space-y-4">
           <div className="flex justify-between items-center px-1">
              <h3 className="text-xl font-black">Alunos</h3>
              <span className="text-[10px] font-black text-text-sub uppercase">Ativos: {students.length}</span>
           </div>
           <div className="space-y-3">
              {students.map(student => (
                <div key={student.id} className="bg-white dark:bg-surface-dark p-4 rounded-[24px] border border-gray-100 dark:border-gray-800 flex items-center gap-4">
                   <img src={student.avatar} alt={student.name} className="size-12 rounded-xl border border-gray-100" />
                   <div className="flex-1">
                      <p className="font-bold text-sm">{student.name}</p>
                      <div className="flex gap-1 mt-1">
                         {student.difficultySubjects.slice(0, 2).map(sub => (
                           <span key={sub} className="text-[8px] font-black uppercase bg-red-50 text-red-500 px-2 py-0.5 rounded">Atenção: {sub}</span>
                         ))}
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-xs font-black text-primary">{student.xp} XP</p>
                      <span className="material-symbols-outlined text-gray-300 text-sm">chevron_right</span>
                   </div>
                </div>
              ))}
           </div>
        </section>

        {/* Módulo de Criação Rápida */}
        <button 
          onClick={() => navigate('/teacher/create')}
          className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3"
        >
           <span className="material-symbols-outlined">add_task</span>
           Atribuir Atividade com IA
        </button>
      </main>
    </div>
  );
};

export default ClassDetailsPage;
