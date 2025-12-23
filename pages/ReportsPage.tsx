
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Exercise } from '../types';

interface Props {
  history: Exercise[];
}

const ReportsPage: React.FC<Props> = ({ history }) => {
  const navigate = useNavigate();

  const totalExercises = history.length;
  const scoredExercises = history.filter(e => e.score !== undefined);
  const avgScore = scoredExercises.length > 0 
    ? scoredExercises.reduce((acc, curr) => acc + (curr.score || 0), 0) / scoredExercises.length 
    : 0;

  const subjects = Array.from(new Set(history.map(e => e.subject)));
  const subjectStats = subjects.map(sub => {
    const subExercises = history.filter(e => e.subject === sub);
    const subScored = subExercises.filter(e => e.score !== undefined);
    const subAvg = subScored.length > 0 
      ? subScored.reduce((acc, curr) => acc + (curr.score || 0), 0) / subScored.length 
      : 0;
    return { name: sub, avg: subAvg, count: subExercises.length };
  });

  return (
    <div className="flex flex-col min-h-full pb-10">
      <header className="p-6 pt-10">
        <h1 className="text-3xl font-black text-primary leading-none">Relatórios</h1>
        <p className="text-xs font-bold text-text-sub uppercase tracking-[3px] mt-1">Evolução do Estudante</p>
      </header>

      <main className="px-6 space-y-8">
        {/* Overview Cards */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-soft">
            <span className="material-symbols-outlined text-primary mb-2">task_alt</span>
            <p className="text-2xl font-black">{totalExercises}</p>
            <p className="text-[10px] font-bold text-text-sub uppercase">Atividades</p>
          </div>
          <div className="bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-soft">
            <span className="material-symbols-outlined text-yellow-500 mb-2">star</span>
            <p className="text-2xl font-black">{avgScore.toFixed(1)}</p>
            <p className="text-[10px] font-bold text-text-sub uppercase">Média Geral</p>
          </div>
        </section>

        {/* Progress by Subject */}
        <section className="space-y-4">
          <h3 className="text-xl font-black px-1">Desempenho por Matéria</h3>
          <div className="bg-white dark:bg-surface-dark p-6 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-soft space-y-6">
            {subjectStats.length > 0 ? subjectStats.map((stat, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-end px-1">
                  <span className="font-bold text-sm">{stat.name}</span>
                  <span className="text-[10px] font-black text-primary">{stat.avg.toFixed(1)} / 10</span>
                </div>
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-1">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-1000 shadow-glow"
                    style={{ width: `${stat.avg * 10}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-text-sub text-right px-1">{stat.count} exercícios feitos</p>
              </div>
            )) : (
              <p className="text-center text-text-sub py-4">Sem dados suficientes para gerar gráficos.</p>
            )}
          </div>
        </section>

        {/* Recent Mastery */}
        <section className="space-y-4">
          <h3 className="text-xl font-black px-1">Últimas Conquistas</h3>
          <div className="flex flex-col gap-3">
            {scoredExercises.slice(0, 3).map((item, i) => (
              <div key={i} className="bg-white dark:bg-surface-dark p-4 rounded-2xl flex items-center gap-4 border border-gray-100 dark:border-gray-800">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-xl">workspace_premium</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold truncate">{item.title}</p>
                  <p className="text-[10px] text-text-sub uppercase">{item.childName} • {new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="font-black text-primary">{item.score?.toFixed(1)}</div>
              </div>
            ))}
            {scoredExercises.length === 0 && (
              <div className="text-center py-10 bg-gray-50 dark:bg-surface-dark rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                <p className="text-sm text-text-sub">Faça um quiz para ver suas conquistas aqui!</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ReportsPage;
