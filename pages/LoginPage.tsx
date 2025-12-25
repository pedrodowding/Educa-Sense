
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Child } from '../types';

interface Props {
  onLogin: (email: string, role: 'guardian' | 'teacher', name?: string) => void;
  children: Child[];
}

const LoginPage: React.FC<Props> = ({ onLogin, children }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'parent' | 'child' | 'teacher'>('parent');
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'parent') {
      onLogin(email, 'guardian');
      navigate('/dashboard');
    } else if (activeTab === 'teacher') {
      onLogin(email, 'teacher');
      navigate('/teacher');
    }
  };

  const handleChildLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const child = children.find(c => c.accessCode.toUpperCase() === accessCode.toUpperCase());
    if (child) {
      localStorage.setItem('educasense_active_child', child.id);
      navigate('/student');
    } else {
      alert('Código de acesso inválido!');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-background-dark p-8">
      <div className="flex-1 flex flex-col justify-center gap-8">
        <div className="space-y-4">
           <div className="size-16 bg-primary rounded-[24px] flex items-center justify-center text-black font-black text-2xl shadow-glow">ES</div>
           <h1 className="text-4xl font-black leading-tight">
              Acesse o <br/>
              <span className="text-primary italic">Educa Sense</span>
           </h1>
        </div>

        {/* Tabs de Perfis */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-[24px]">
           {(['parent', 'child', 'teacher'] as const).map(tab => (
             <button 
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`flex-1 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white dark:bg-surface-dark shadow-sm text-primary' : 'text-gray-400'}`}
             >
               {tab === 'parent' ? 'Família' : tab === 'child' ? 'Aluno' : 'Professor'}
             </button>
           ))}
        </div>

        {activeTab !== 'child' ? (
          <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">E-mail de acesso</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={activeTab === 'teacher' ? "edu.professor@escola.com" : "familia@email.com"}
                className="w-full h-16 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 font-bold focus:ring-2 focus:ring-primary" 
              />
            </div>
            <button 
              type="submit"
              className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              Entrar como {activeTab === 'teacher' ? 'Docente' : 'Responsável'}
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleChildLogin} className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1 text-center block">Seu Código Mágico</label>
              <input 
                type="text" 
                required
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="Ex: LUC-123"
                className="w-full h-20 bg-primary/5 border-2 border-dashed border-primary/30 text-center text-3xl font-black rounded-3xl tracking-[8px] focus:ring-0" 
              />
            </div>
            <button 
              type="submit"
              className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              Iniciar Aventura
              <span className="material-symbols-outlined">rocket_launch</span>
            </button>
          </form>
        )}
      </div>
      <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-4">© 2025 Educa Sense • Versão 3.0</p>
    </div>
  );
};

export default LoginPage;
