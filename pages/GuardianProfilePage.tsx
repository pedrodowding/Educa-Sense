
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Guardian } from '../types';

interface Props {
  guardian: Guardian | null;
  onUpdate: (updates: Partial<Guardian>) => void;
  onLogout: () => void;
}

const GuardianProfilePage: React.FC<Props> = ({ guardian, onUpdate, onLogout }) => {
  const navigate = useNavigate();
  const [name, setName] = useState(guardian?.name || '');
  const [email, setEmail] = useState(guardian?.email || '');
  const [saving, setSaving] = useState(false);

  if (!guardian) return null;

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      onUpdate({ name, email });
      setSaving(false);
      alert('Perfil atualizado com sucesso!');
    }, 600);
  };

  return (
    <div className="flex flex-col min-h-full pb-10 bg-gray-50 dark:bg-background-dark">
      <header className="p-6 pt-10 flex items-center gap-4 bg-white dark:bg-surface-dark border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => navigate(-1)} className="size-10 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-2xl font-black text-primary leading-none">Seu Perfil</h1>
          <p className="text-[10px] font-bold text-text-sub uppercase tracking-widest mt-1">Gerencie sua conta</p>
        </div>
      </header>

      <main className="px-6 py-8 space-y-6">
        <div className="flex flex-col items-center">
          <div className="size-32 rounded-[40px] bg-gray-200 overflow-hidden border-4 border-primary shadow-xl mb-4 relative">
             <img src={guardian.avatar} alt="Avatar" className="w-full h-full object-cover" />
             <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <span className="material-symbols-outlined text-white">photo_camera</span>
             </div>
          </div>
          <button className="text-xs font-black text-primary uppercase tracking-widest">Alterar Foto</button>
        </div>

        <section className="bg-white dark:bg-surface-dark p-6 rounded-[32px] shadow-soft border border-gray-100 dark:border-gray-800 space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Nome Completo</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl h-14 px-4 font-bold focus:ring-2 focus:ring-primary" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl h-14 px-4 font-bold focus:ring-2 focus:ring-primary" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Plano Atual</label>
            <div className="w-full bg-primary/10 rounded-2xl h-14 px-4 flex items-center justify-between">
              <span className="font-black text-primary uppercase tracking-widest">{guardian.plan} Family</span>
              <span className="bg-primary text-black text-[10px] font-black px-2 py-1 rounded">ATIVO</span>
            </div>
          </div>
        </section>

        <div className="space-y-3 pt-4">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>

          <button 
            onClick={onLogout}
            className="w-full h-14 border-2 border-red-500/20 text-red-500 font-bold uppercase text-[10px] tracking-widest rounded-2xl active:bg-red-500/10 transition-colors"
          >
            Sair da Conta
          </button>
        </div>
      </main>
    </div>
  );
};

export default GuardianProfilePage;
