
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Guardian, ClassGroup } from '../types';

interface Props {
  teacher: Guardian | null;
  classes: ClassGroup[];
}

const TeacherDashboardPage: React.FC<Props> = ({ teacher, classes }) => {
  const navigate = useNavigate();

  const getFirstName = () => {
    if (!teacher?.name) return 'Professor';
    const parts = teacher.name.split(' ');
    return parts[parts.length - 1] || 'Professor';
  };

  return (
    <div className="flex flex-col min-h-full pb-20">
      <header className="p-6 pt-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary leading-none">Olá, Prof. {getFirstName()}</h1>
          <p className="text-xs font-bold text-text-sub uppercase tracking-[3px] mt-1">Visão Pedagógica</p>
        </div>
        <div className="size-14 rounded-2xl bg-primary/20 border-2 border-primary overflow-hidden flex items-center justify-center">
           {teacher?.avatar && <img src={teacher.avatar} alt="Avatar" className="w-full h-full object-cover" />}
        </div>
      </header>

      <main className="px-6 space-y-8">
        <section className="grid grid-cols-2 gap-4">
           <div className="bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-soft">
              <span className="material-symbols-outlined text-blue-400 mb-2">trending_up</span>
              <p className="text-2xl font-black">88%</p>
              <p className="text-[10px] font-bold text-text-sub uppercase">Engajamento</p>
           </div>
           <div className="bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-soft">
              <span className="material-symbols-outlined text-orange-400 mb-2">warning</span>
              <p className="text-2xl font-black">4</p>
              <p className="text-[10px] font-bold text-text-sub uppercase">Alertas IA</p>
           </div>
        </section>

        <section className="bg-background-dark text-white p-6 rounded-[40px] shadow-glow relative overflow-hidden">
           <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                 <span className="material-symbols-outlined text-primary text-sm">psychology</span>
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">Insight Pedagógico IA</h3>
              </div>
              <p className="text-sm font-medium leading-relaxed italic text-gray-300">
                "Detectamos uma dificuldade coletiva em **Matemática (Geometria)** na Turma 3º Ano B. Sugerimos criar um desafio prático de artes para reforçar conceitos espaciais."
              </p>
              <button 
                onClick={() => navigate('/teacher/create')}
                className="text-[10px] font-black uppercase text-primary underline"
              >
                Gerar Atividade de Reforço
              </button>
           </div>
           <span className="material-symbols-outlined absolute -right-6 -bottom-6 text-primary/5 text-[140px] rotate-12">school</span>
        </section>

        <section className="space-y-4">
           <h3 className="text-xl font-black px-1">Minhas Turmas</h3>
           <div className="space-y-3">
              {classes.map(cls => (
                <button 
                  key={cls.id}
                  onClick={() => navigate(`/teacher/class/${cls.id}`)}
                  className="w-full bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-soft flex items-center justify-between active:scale-95 transition-all"
                >
                   <div className="flex items-center gap-4">
                      <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                         <span className="material-symbols-outlined">group</span>
                      </div>
                      <div className="text-left">
                         <h4 className="font-black text-lg leading-none mb-1">{cls.name}</h4>
                         <p className="text-[10px] font-black text-text-sub uppercase tracking-widest">{cls.studentCount} Alunos • {cls.grade}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-xs font-black text-primary">{cls.engagement}%</p>
                      <p className="text-[8px] font-bold uppercase text-gray-400">Atividade</p>
                   </div>
                </button>
              ))}
           </div>
        </section>
      </main>
    </div>
  );
};

export default TeacherDashboardPage;
