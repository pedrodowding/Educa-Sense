
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Child } from '../types';

interface Props {
  onLogin: (email: string, name?: string) => void;
  children: Child[];
}

const LoginPage: React.FC<Props> = ({ onLogin, children }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'parent' | 'child'>('parent');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmitParent = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      onLogin(email, name);
      navigate('/dashboard');
    }
  };

  const handleSubmitChild = (e: React.FormEvent) => {
    e.preventDefault();
    const child = children.find(c => c.accessCode.toUpperCase() === accessCode.toUpperCase());
    if (child) {
      // Simula login de criança salvando no storage
      localStorage.setItem('educasense_active_child', child.id);
      navigate('/student');
    } else {
      alert('Código de acesso inválido. Peça ao seu responsável!');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-background-dark p-8">
      <div className="flex-1 flex flex-col justify-center gap-6">
        <div className="space-y-4">
           <div onClick={() => navigate('/')} className="size-16 bg-primary rounded-[24px] flex items-center justify-center text-black font-black text-2xl shadow-glow cursor-pointer">ES</div>
           <h1 className="text-4xl font-black leading-tight">
              Acesse o <br/>
              <span className="text-primary">Educa Sense</span>
           </h1>
        </div>

        {/* Tabs de Login */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
           <button 
            onClick={() => setActiveTab('parent')}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'parent' ? 'bg-white dark:bg-surface-dark shadow-sm text-primary' : 'text-gray-400'}`}
           >
             Responsáveis
           </button>
           <button 
            onClick={() => setActiveTab('child')}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'child' ? 'bg-white dark:bg-surface-dark shadow-sm text-primary' : 'text-gray-400'}`}
           >
             Alunos
           </button>
        </div>

        {activeTab === 'parent' ? (
          <form onSubmit={handleSubmitParent} className="space-y-4 animate-fade-in">
            {isRegistering && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Seu Nome</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como quer ser chamado?"
                  className="w-full h-16 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 font-bold focus:ring-2 focus:ring-primary" 
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Seu E-mail</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                className="w-full h-16 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 font-bold focus:ring-2 focus:ring-primary" 
              />
            </div>
            <button 
              type="submit"
              className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {isRegistering ? 'Criar Conta' : 'Entrar'}
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
            <button 
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="w-full text-center text-[10px] font-black uppercase text-text-sub py-2"
            >
              {isRegistering ? 'Já tenho conta' : 'Não tenho conta, cadastrar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitChild} className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1 text-center block">Código de Acesso Mágico</label>
              <input 
                type="text" 
                required
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="Ex: LUC-123"
                className="w-full h-20 bg-primary/5 border-2 border-dashed border-primary/30 text-center text-2xl font-black rounded-3xl tracking-[10px] focus:ring-0 focus:border-primary" 
              />
            </div>
            <button 
              type="submit"
              className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              Começar Aventura
              <span className="material-symbols-outlined">rocket_launch</span>
            </button>
            <p className="text-center text-xs text-text-sub px-6">
              Peça seu código secreto para o seu responsável e digite aqui!
            </p>
          </form>
        )}
      </div>
      
      <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-4">
        © 2025 Educa Sense • Versão 2.1
      </p>
    </div>
  );
};

export default LoginPage;
