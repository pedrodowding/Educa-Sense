
import React from 'react';
import { useNavigate } from 'react-router-dom';

const ProgramsListPage: React.FC = () => {
  const navigate = useNavigate();

  const programs = [
    { 
      id: 'ex-facil', 
      name: 'Exercício Fácil', 
      desc: 'Atividades e quizzes com IA personalizados.', 
      status: 'Ativo', 
      icon: 'auto_awesome', 
      path: '/exercicio-facil',
      color: 'bg-primary'
    },
    { 
      id: 'leitura', 
      name: 'Leitura Guiada', 
      desc: 'Analise e incentive a leitura do seu filho.', 
      status: 'Ativo', 
      icon: 'menu_book', 
      path: '/leitura-guiada',
      color: 'bg-blue-400'
    },
    { 
      id: 'artes', 
      name: 'Artes Criativas', 
      desc: 'Desafios de desenho e expressão artística.', 
      status: 'Ativo', 
      icon: 'palette', 
      path: '/artes-criativas',
      color: 'bg-purple-400'
    },
    { 
      id: 'ingles', 
      name: 'Inglês Todo Dia', 
      desc: 'Vocabulário básico com foco no dia a dia.', 
      status: 'Ativo', 
      icon: 'language', 
      path: '/ingles-todo-dia',
      color: 'bg-orange-400'
    }
  ];

  return (
    <div className="flex flex-col min-h-full pb-10">
      <header className="p-6 pt-10">
        <h1 className="text-3xl font-black text-primary leading-none">Programas</h1>
        <p className="text-xs font-bold text-text-sub uppercase tracking-[3px] mt-1">Sua Jornada Educacional</p>
      </header>

      <main className="px-6 space-y-4">
        {programs.map(prog => (
          <button 
            key={prog.id}
            onClick={() => navigate(prog.path)}
            className={`w-full text-left p-6 rounded-[32px] border shadow-soft transition-all active:scale-95 bg-white dark:bg-surface-dark border-gray-100 dark:border-gray-800`}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`size-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${prog.color}`}>
                <span className="material-symbols-outlined">{prog.icon}</span>
              </div>
              <div className="flex-1">
                 <div className="flex justify-between items-center">
                    <h3 className="font-black text-lg">{prog.name}</h3>
                    <span className={`text-[8px] font-black uppercase px-2 py-1 rounded bg-primary text-black`}>
                      {prog.status}
                    </span>
                 </div>
                 <p className="text-xs text-text-sub font-medium leading-snug">{prog.desc}</p>
              </div>
            </div>
            <div className="flex items-center justify-end text-primary text-[10px] font-black uppercase tracking-widest gap-2">
               Começar <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </div>
          </button>
        ))}
      </main>
    </div>
  );
};

export default ProgramsListPage;
