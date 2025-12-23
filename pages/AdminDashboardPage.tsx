
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Exercise } from '../types';

interface Props {
  history: Exercise[];
}

const AdminDashboardPage: React.FC<Props> = ({ history }) => {
  const navigate = useNavigate();

  const stats = [
    { label: 'Exercícios Criados', value: history.length, icon: 'auto_awesome', color: 'text-primary' },
    { label: 'Usuários Ativos', value: 124, icon: 'group', color: 'text-blue-500' },
    { label: 'Saúde do Sistema', value: '99.9%', icon: 'bolt', color: 'text-yellow-500' },
    { label: 'Uso de Créditos IA', value: '45%', icon: 'database', color: 'text-purple-500' }
  ];

  return (
    <div className="flex flex-col min-h-full pb-10">
      <header className="p-6 pt-10 bg-black text-white rounded-b-[40px] mb-8">
        <div className="flex items-center justify-between mb-8">
           <button onClick={() => navigate('/dashboard')} className="size-10 rounded-full bg-white/10 flex items-center justify-center">
             <span className="material-symbols-outlined">arrow_back</span>
           </button>
           <h1 className="text-sm font-black uppercase tracking-widest">Painel Admin</h1>
           <div className="size-10"></div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pb-4">
           {stats.map((s, i) => (
             <div key={i} className="bg-white/5 p-4 rounded-3xl border border-white/10">
                <span className={`material-symbols-outlined mb-2 ${s.color}`}>{s.icon}</span>
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
             </div>
           ))}
        </div>
      </header>

      <main className="px-6 space-y-6">
        <section className="space-y-4">
           <h3 className="text-xl font-black px-1">Atividade Recente</h3>
           <div className="bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden divide-y divide-gray-50 dark:divide-gray-800 shadow-soft">
              {history.slice(0, 5).map((ex, i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                   <div>
                      <p className="text-sm font-bold">{ex.title}</p>
                      <p className="text-[10px] text-text-sub uppercase">{ex.subject} • {ex.childName}</p>
                   </div>
                   <span className="text-[10px] font-black text-gray-400">{new Date(ex.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
              {history.length === 0 && (
                <p className="p-8 text-center text-text-sub text-sm">Nenhuma atividade registrada ainda.</p>
              )}
           </div>
        </section>

        <section className="space-y-4">
           <h3 className="text-xl font-black px-1">Controle de Módulos</h3>
           <div className="space-y-3">
              {[
                { name: 'Exercício Fácil', active: true },
                { name: 'Dashboard de Pais', active: true },
                { name: 'Processamento IA', active: true },
                { name: 'Módulo de Relatórios', active: true }
              ].map((mod, i) => (
                <div key={i} className="bg-white dark:bg-surface-dark p-4 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-gray-800">
                   <span className="font-bold text-sm">{mod.name}</span>
                   <div className={`w-10 h-5 rounded-full relative ${mod.active ? 'bg-primary' : 'bg-gray-300'}`}>
                      <div className={`absolute top-1 size-3 bg-white rounded-full transition-all ${mod.active ? 'right-1' : 'left-1'}`}></div>
                   </div>
                </div>
              ))}
           </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboardPage;
