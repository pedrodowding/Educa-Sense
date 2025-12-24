
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Child, Subject, Guardian } from '../types';

interface Props {
  children: Child[];
  onUpdateChild: (id: string, updates: Partial<Child>) => void;
  onAddChild: (child: Child) => void;
  guardian: Guardian | null;
}

const SettingsPage: React.FC<Props> = ({ children, onUpdateChild, onAddChild, guardian }) => {
  const navigate = useNavigate();
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState<Child | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  
  // Suporte Form State
  const [supportSubject, setSupportSubject] = useState('Duvidas');
  const [supportMessage, setSupportMessage] = useState('');
  const [ticketStatus, setTicketStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  const [newChild, setNewChild] = useState<Partial<Child>>({
    name: '',
    age: 7,
    grade: '1º Ano',
    difficultySubjects: [],
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

  const toggleSubject = (sub: Subject) => {
    if (editingChild) {
      const current = editingChild.difficultySubjects || [];
      const updated = current.includes(sub) 
        ? current.filter(s => s !== sub) 
        : [...current, sub];
      setEditingChild({ ...editingChild, difficultySubjects: updated });
    } else if (isAdding) {
      const current = newChild.difficultySubjects || [];
      const updated = current.includes(sub) 
        ? current.filter(s => s !== sub) 
        : [...current, sub];
      setNewChild({ ...newChild, difficultySubjects: updated });
    }
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTicketStatus('sending');
    // Simula envio de ticket
    setTimeout(() => {
      setTicketStatus('success');
      setTimeout(() => {
        setShowSupportModal(false);
        setTicketStatus('idle');
        setSupportMessage('');
      }, 2000);
    }, 1500);
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
                <div onClick={() => navigate(`/child/${child.id}`)} className="size-16 rounded-2xl bg-gray-50 dark:bg-gray-800 overflow-hidden border border-gray-100 dark:border-gray-800 cursor-pointer">
                  <img src={child.avatar} alt={child.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1" onClick={() => navigate(`/child/${child.id}`)}>
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

        <section className="space-y-4">
           <h3 className="text-xl font-black px-1">Suporte</h3>
           <div className="bg-white dark:bg-surface-dark rounded-[40px] p-6 border border-gray-100 dark:border-gray-800 shadow-soft">
              <div className="flex items-center gap-4 mb-4">
                 <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">help_center</span>
                 </div>
                 <div>
                    <h4 className="font-bold">Central de Ajuda</h4>
                    <p className="text-xs text-text-sub">Precisa de suporte ou quer sugerir algo?</p>
                 </div>
              </div>
              <button 
                onClick={() => setShowSupportModal(true)}
                className="w-full h-14 bg-primary text-black font-black uppercase text-xs tracking-widest rounded-2xl shadow-glow active:scale-95 transition-all"
              >
                Fale Conosco
              </button>
           </div>
        </section>
      </main>

      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-[40px] p-8 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-black">Fale Conosco</h2>
               <button onClick={() => setShowSupportModal(false)} className="size-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            {ticketStatus === 'success' ? (
              <div className="py-10 text-center space-y-4 animate-fade-in">
                 <div className="size-20 bg-primary/20 rounded-full flex items-center justify-center text-primary mx-auto">
                    <span className="material-symbols-outlined text-4xl">check_circle</span>
                 </div>
                 <h3 className="text-xl font-black">Ticket Criado!</h3>
                 <p className="text-sm text-text-sub">Protocolo: #ES-{Math.floor(1000 + Math.random() * 9000)}<br/>Responderemos em até 24 horas.</p>
              </div>
            ) : (
              <form onSubmit={handleSupportSubmit} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Seu E-mail</label>
                    <input 
                      type="text" 
                      disabled 
                      value={guardian?.email || 'usuario@email.com'} 
                      className="w-full bg-gray-100 dark:bg-gray-900 border-none rounded-2xl h-14 px-4 font-bold opacity-60" 
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Assunto</label>
                    <select 
                      value={supportSubject}
                      onChange={(e) => setSupportSubject(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl h-14 px-4 font-bold"
                    >
                       <option value="Duvidas">Dúvidas</option>
                       <option value="Reclamação">Reclamação</option>
                       <option value="Ajuda">Ajuda Técnica</option>
                    </select>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Sua Mensagem</label>
                    <textarea 
                      required
                      placeholder="Como podemos te ajudar?"
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-3xl p-4 font-bold h-32 resize-none"
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                    ></textarea>
                 </div>

                 <button 
                  type="submit" 
                  disabled={ticketStatus === 'sending'}
                  className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3"
                 >
                    {ticketStatus === 'sending' ? 'Enviando...' : 'Abrir Chamado'}
                    <span className="material-symbols-outlined">send</span>
                 </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Adicionar/Editar Estudante */}
      {(editingChild || isAdding) && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 no-print">
          <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-[40px] p-8 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-black">{isAdding ? 'Novo Estudante' : 'Editar Estudante'}</h2>
               <button onClick={() => { setEditingChild(null); setIsAdding(false); }} className="size-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={isAdding ? handleAdd : handleUpdate} className="space-y-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Dados Básicos</label>
                 <input type="text" placeholder="Nome" required className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl h-14 px-4 font-bold" value={isAdding ? newChild.name : editingChild?.name} onChange={(e) => isAdding ? setNewChild({...newChild, name: e.target.value}) : setEditingChild({...editingChild!, name: e.target.value})} />
                 <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Idade" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl h-14 px-4 font-bold" value={isAdding ? newChild.age : editingChild?.age} onChange={(e) => isAdding ? setNewChild({...newChild, age: parseInt(e.target.value)}) : setEditingChild({...editingChild!, age: parseInt(e.target.value)})} />
                    <input type="text" placeholder="Série" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl h-14 px-4 font-bold" value={isAdding ? newChild.grade : editingChild?.grade} onChange={(e) => isAdding ? setNewChild({...newChild, grade: e.target.value}) : setEditingChild({...editingChild!, grade: e.target.value})} />
                 </div>
               </div>

               <div className="space-y-3">
                 <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Matérias com maior dificuldade</label>
                 <div className="grid grid-cols-2 gap-2">
                    {Object.values(Subject).map(sub => {
                      const selected = isAdding 
                        ? newChild.difficultySubjects?.includes(sub) 
                        : editingChild?.difficultySubjects?.includes(sub);
                      return (
                        <button 
                          key={sub}
                          type="button"
                          onClick={() => toggleSubject(sub)}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${selected ? 'border-primary bg-primary/10 text-primary' : 'border-gray-50 dark:border-gray-800'}`}
                        >
                          <span className="material-symbols-outlined text-sm">{selected ? 'check_circle' : 'circle'}</span>
                          <span className="text-xs font-bold">{sub}</span>
                        </button>
                      );
                    })}
                 </div>
               </div>

               <button type="submit" className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow">
                  {isAdding ? 'Adicionar Estudante' : 'Salvar Alterações'}
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
