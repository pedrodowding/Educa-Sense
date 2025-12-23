
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Child, Subject } from '../types';

interface Props {
  children: Child[];
  onUpdateChild: (id: string, updates: Partial<Child>) => void;
  onAddChild: (child: Child) => void;
}

const SettingsPage: React.FC<Props> = ({ children, onUpdateChild, onAddChild }) => {
  const navigate = useNavigate();
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState<Child | null>(null);
  
  const [newChild, setNewChild] = useState<Partial<Child>>({
    name: '',
    age: 7,
    grade: '1º Ano',
    difficultySubject: Subject.MATH,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
    accessCode: `ACC-${Math.floor(100 + Math.random() * 900)}`
  });

  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'));

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingChild) {
      onUpdateChild(editingChild.id, editingChild);
      setEditingChild(null);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const id = Math.random().toString(36).substr(2, 9);
    const accessCode = `${newChild.name?.substring(0,3).toUpperCase() || 'ACC'}-${Math.floor(100 + Math.random() * 900)}`;
    onAddChild({ ...newChild, id, accessCode, xp: 0, stars: 0, streak: 0 } as Child);
    setIsAdding(false);
    setNewChild({
      name: '',
      age: 7,
      grade: '1º Ano',
      difficultySubject: Subject.MATH,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
      accessCode: ''
    });
  };

  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div className="flex flex-col min-h-full pb-10 bg-gray-50 dark:bg-background-dark">
      <header className="p-6 pt-10 bg-white dark:bg-surface-dark border-b border-gray-100 dark:border-gray-800 no-print">
        <h1 className="text-3xl font-black text-primary leading-none">Ajustes</h1>
        <p className="text-xs font-bold text-text-sub uppercase tracking-[3px] mt-1">Configurações Gerais</p>
      </header>

      <main className="px-6 py-8 space-y-10 no-print">
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xl font-black">Estudantes</h3>
            <button 
              onClick={() => setIsAdding(true)}
              className="size-10 rounded-2xl bg-primary text-black flex items-center justify-center shadow-glow active:scale-90 transition-all"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {children.map(child => (
              <div key={child.id} className="bg-white dark:bg-surface-dark p-4 rounded-[32px] border border-gray-100 dark:border-gray-800 flex items-center gap-4 shadow-sm">
                <div className="size-16 rounded-2xl bg-gray-50 dark:bg-gray-800 overflow-hidden border border-gray-100 dark:border-gray-800">
                  <img src={child.avatar} alt={child.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-base leading-none mb-1">{child.name}</p>
                  <p className="text-[10px] text-text-sub font-black uppercase tracking-widest">{child.grade} • <span className="text-primary">{child.xp} XP</span></p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowInviteModal(child)}
                    className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center active:scale-90 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">magic_button</span>
                  </button>
                  <button 
                    onClick={() => setEditingChild(child)}
                    className="size-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center active:bg-primary/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm text-text-sub">edit</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-black px-1">Interface</h3>
          <div className="bg-white dark:bg-surface-dark rounded-[32px] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-soft">
            <button onClick={toggleDarkMode} className="w-full flex items-center justify-between p-5 border-b border-gray-50 dark:border-gray-800 active:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-text-sub">{darkMode ? 'dark_mode' : 'light_mode'}</span>
                <span className="font-bold">Modo Escuro</span>
              </div>
              <div className={`w-12 h-6 rounded-full relative ${darkMode ? 'bg-primary' : 'bg-gray-200'}`}>
                <div className={`absolute top-1 size-4 bg-white rounded-full transition-all ${darkMode ? 'left-7' : 'left-1'}`}></div>
              </div>
            </button>
          </div>
        </section>
      </main>

      {/* Cartão de Impressão (Só aparece no print) */}
      {showInviteModal && (
        <div className="print-only p-10 flex flex-col items-center justify-center min-h-screen">
           <div className="w-[10cm] h-[15cm] border-4 border-black p-8 rounded-[40px] text-center flex flex-col justify-between">
              <div className="space-y-2">
                 <div className="size-16 bg-black text-white mx-auto flex items-center justify-center text-2xl font-black rounded-2xl">ES</div>
                 <h2 className="text-2xl font-black">Educa Sense</h2>
                 <p className="text-[10px] font-bold uppercase tracking-widest italic">O seu portal para o conhecimento</p>
              </div>
              
              <div className="space-y-4">
                 <div className="size-40 mx-auto rounded-full border-4 border-black overflow-hidden">
                    <img src={showInviteModal.avatar} alt="Avatar" className="w-full h-full object-cover" />
                 </div>
                 <div>
                    <h3 className="text-3xl font-black">{showInviteModal.name}</h3>
                    <p className="text-xs font-bold">{showInviteModal.grade}</p>
                 </div>
              </div>

              <div className="space-y-2">
                 <p className="text-[10px] font-black uppercase tracking-widest">Seu Código Mágico de Acesso:</p>
                 <div className="bg-gray-100 p-4 rounded-2xl border-2 border-black">
                    <p className="text-3xl font-black tracking-[5px]">{showInviteModal.accessCode}</p>
                 </div>
                 <p className="text-[8px] font-bold mt-4">Acesse em educasense.com e clique em "Alunos"</p>
              </div>
           </div>
        </div>
      )}

      {/* Modal Convite Interativo */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 no-print">
           <div className="w-full max-w-sm bg-white dark:bg-surface-dark rounded-[40px] p-8 text-center space-y-6 shadow-2xl animate-fade-in-scale">
              <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                 <span className="material-symbols-outlined text-primary text-4xl">magic_button</span>
              </div>
              <div>
                 <h2 className="text-2xl font-black">Convite Mágico</h2>
                 <p className="text-sm text-text-sub mt-1">Crie um cartão físico ou envie o código!</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-3xl border-2 border-dashed border-primary/30">
                 <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Código de {showInviteModal.name}</p>
                 <p className="text-3xl font-black tracking-widest">{showInviteModal.accessCode}</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={handlePrintCard}
                  className="w-full h-16 bg-black text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined">print</span>
                  Imprimir Cartão
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`Ei ${showInviteModal.name}! Use este código no Educa Sense: ${showInviteModal.accessCode}`);
                    alert('Copiado!');
                  }}
                  className="w-full h-14 bg-primary text-black font-black rounded-2xl shadow-glow flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                  Copiar Link
                </button>
              </div>

              <button onClick={() => setShowInviteModal(null)} className="text-xs font-black uppercase text-gray-400">Voltar</button>
           </div>
        </div>
      )}

      {/* Modal Adicionar/Editar */}
      {(editingChild || isAdding) && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 no-print">
          <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-[40px] p-8 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-black">{isAdding ? 'Novo Estudante' : 'Editar Estudante'}</h2>
               <button onClick={() => { setEditingChild(null); setIsAdding(false); }} className="size-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={isAdding ? handleAdd : handleUpdate} className="space-y-5">
               <input type="text" placeholder="Nome" required className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl h-14 px-4 font-bold" value={isAdding ? newChild.name : editingChild?.name} onChange={(e) => isAdding ? setNewChild({...newChild, name: e.target.value}) : setEditingChild({...editingChild!, name: e.target.value})} />
               <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Idade" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl h-14 px-4 font-bold" value={isAdding ? newChild.age : editingChild?.age} onChange={(e) => isAdding ? setNewChild({...newChild, age: parseInt(e.target.value)}) : setEditingChild({...editingChild!, age: parseInt(e.target.value)})} />
                  <input type="text" placeholder="Série" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl h-14 px-4 font-bold" value={isAdding ? newChild.grade : editingChild?.grade} onChange={(e) => isAdding ? setNewChild({...newChild, grade: e.target.value}) : setEditingChild({...editingChild!, grade: e.target.value})} />
               </div>
               <button type="submit" className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow">{isAdding ? 'Adicionar' : 'Salvar'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
