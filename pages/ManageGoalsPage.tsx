
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Child, BehaviorGoal } from '../types';

interface Props {
  children: Child[];
  goals: BehaviorGoal[];
  onAddGoal: (goal: BehaviorGoal) => void;
  onDeleteGoal: (id: string) => void;
}

const ManageGoalsPage: React.FC<Props> = ({ children, goals, onAddGoal, onDeleteGoal }) => {
  const navigate = useNavigate();
  const [selectedChild, setSelectedChild] = useState<Child>(children[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState(5);

  const childGoals = goals.filter(g => g.childId === selectedChild.id);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    
    const goal: BehaviorGoal = {
      id: Math.random().toString(36).substr(2, 9),
      childId: selectedChild.id,
      title: newTitle,
      targetDays: newTarget,
      completedDays: []
    };
    
    onAddGoal(goal);
    setNewTitle('');
    setShowAddForm(false);
  };

  return (
    <div className="flex flex-col min-h-full pb-20 bg-gray-50 dark:bg-background-dark">
      <header className="p-6 pt-10 flex items-center justify-between bg-white dark:bg-surface-dark border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => navigate(-1)} className="size-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-black">Metas da Semana</h1>
        <button 
          onClick={() => setShowAddForm(true)}
          className="size-10 rounded-full bg-primary text-black flex items-center justify-center shadow-glow"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </header>

      <main className="p-6 space-y-6">
        {/* Child Selection Filter */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
           {children.map(c => (
             <button 
               key={c.id}
               onClick={() => setSelectedChild(c)}
               className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 shrink-0 transition-all ${selectedChild.id === c.id ? 'border-primary bg-primary/10' : 'border-gray-100 opacity-50'}`}
             >
                <img src={c.avatar} alt={c.name} className="size-6 rounded-full" />
                <span className="text-xs font-bold">{c.name}</span>
             </button>
           ))}
        </div>

        <section className="space-y-4">
           {childGoals.length > 0 ? childGoals.map(goal => (
             <div key={goal.id} className="bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-soft flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                   <span className="material-symbols-outlined">verified</span>
                </div>
                <div className="flex-1">
                   <p className="font-bold text-sm">{goal.title}</p>
                   <p className="text-[10px] font-black text-text-sub uppercase tracking-widest">{goal.targetDays} dias por semana</p>
                </div>
                <button 
                  onClick={() => onDeleteGoal(goal.id)}
                  className="size-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center"
                >
                   <span className="material-symbols-outlined text-sm">delete</span>
                </button>
             </div>
           )) : (
             <div className="text-center py-20 opacity-30">
                <span className="material-symbols-outlined text-5xl">checklist</span>
                <p className="text-xs font-bold mt-2">Nenhuma meta ativa</p>
             </div>
           )}
        </section>
      </main>

      {/* Add Goal Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-[40px] p-8 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-black">Nova Meta</h2>
               <button onClick={() => setShowAddForm(false)} className="size-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">O que a criança deve fazer?</label>
                 <input 
                   type="text" 
                   required 
                   placeholder="Ex: Escovar os dentes, Guardar brinquedos..."
                   className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl h-14 px-4 font-bold" 
                   value={newTitle} 
                   onChange={(e) => setNewTitle(e.target.value)} 
                 />
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Frequência Semanal (Dias)</label>
                 <div className="flex bg-gray-50 dark:bg-gray-800 p-1 rounded-2xl">
                    {[3, 5, 7].map(d => (
                      <button 
                        key={d}
                        type="button"
                        onClick={() => setNewTarget(d)}
                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${newTarget === d ? 'bg-primary text-black shadow-md' : 'text-gray-400'}`}
                      >
                        {d} Dias
                      </button>
                    ))}
                 </div>
               </div>

               <button type="submit" className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow">
                  Confirmar Meta
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageGoalsPage;
