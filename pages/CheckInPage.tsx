
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Child, DailyCheckIn } from '../types';
import { useSelectedChild } from '../contexts/SelectedChildContext';
import { useDailyProgress } from '../hooks/useDailyProgress';

interface Props {
  children: Child[];
  onSave: (checkIn: DailyCheckIn) => void;
}

const CheckInPage: React.FC<Props> = ({ children, onSave }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedChild, setSelectedChild } = useSelectedChild();
  const [mood, setMood] = useState<DailyCheckIn['mood']>('feliz');
  const [energy, setEnergy] = useState(3);
  const [sleep, setSleep] = useState(3);
  const [school, setSchool] = useState('Equilibrado');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedChild && children.length > 0) {
      setSelectedChild(children[0]);
    }
  }, [children, selectedChild]);

  const moods: { key: DailyCheckIn['mood'], label: string, emoji: string }[] = [
    { key: 'feliz', label: 'Feliz', emoji: '😊' },
    { key: 'calmo', label: 'Calmo', emoji: '😌' },
    { key: 'agitado', label: 'Agitado', emoji: '🏃' },
    { key: 'triste', label: 'Triste', emoji: '😢' },
    { key: 'bravo', label: 'Bravo', emoji: '😠' }
  ];

  const handleSave = async () => {
    if (!selectedChild) {
      alert('Nenhum estudante selecionado.');
      return;
    }
    setSaving(true);
    const newCheckIn: DailyCheckIn = {
      id: Math.random().toString(36).substr(2, 9),
      childId: selectedChild.id,
      date: new Date().toISOString(),
      mood,
      energy,
      sleepQuality: sleep,
      schoolStatus: school,
      event: "Check-in diário"
    };
    
    // Save to global history
    await onSave(newCheckIn);

    // Refresh daily progress if available
    // No need to manually update local storage anymore
    // O hook useDailyProgress irá atualizar automaticamente ao detectar a mudança no banco (via refresh ou polling)
    // Mas aqui não temos acesso direto ao refresh do hook, a menos que passemos via props ou usemos contexto.
    // Como CheckInPage é uma página independente, o usuário provavelmente voltará para o Dashboard ou Rotina.
    // Ao voltar, os componentes dessas páginas farão o fetch atualizado.

    // Navigate back
    const params = new URLSearchParams(location.search);
    const from = params.get('from');
    navigate(from ? `/rotina?from=${from}` : '/rotina');
  };

  if (!selectedChild) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-primary/5">
        <h2 className="text-2xl font-black mb-3">Nenhum estudante encontrado</h2>
        <p className="text-text-sub text-sm font-bold mb-10">Cadastre um estudante para fazer check-in.</p>
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => navigate('/settings')}
            className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all"
          >
            Ir para Configurações
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full h-14 bg-white/70 dark:bg-gray-800 font-black rounded-2xl active:scale-95 transition-all"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-background-dark">
      <header className="p-6 pt-10 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
         <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <span className="material-symbols-outlined">close</span>
         </button>
         <h2 className="text-lg font-black">Check-in Diário</h2>
         <div className="size-10"></div>
      </header>

      <main className="p-6 space-y-10 pb-40 overflow-y-auto no-scrollbar">
        {/* Child Selection */}
        <section className="space-y-3">
           <p className="text-[10px] font-black uppercase text-primary tracking-widest">Para quem?</p>
           <div className="flex gap-4">
              {children.map(c => (
                <button 
                  key={c.id}
                  onClick={() => setSelectedChild(c)}
                  className={`flex flex-col items-center gap-2 transition-all ${selectedChild?.id === c.id ? 'scale-110' : 'opacity-40 grayscale'}`}
                >
                   <img src={c.avatar} alt={c.name} className="size-14 rounded-2xl border-2 border-primary" />
                   <span className="text-[10px] font-black">{c.name}</span>
                </button>
              ))}
           </div>
        </section>

        {/* Mood */}
        <section className="space-y-4">
           <p className="text-[10px] font-black uppercase text-primary tracking-widest text-center">Como foi o humor predominante?</p>
           <div className="flex justify-between gap-2">
              {moods.map(m => (
                <button 
                  key={m.key}
                  onClick={() => setMood(m.key)}
                  className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${mood === m.key ? 'border-primary bg-primary/10' : 'border-gray-50 dark:border-gray-800'}`}
                >
                   <span className="text-2xl">{m.emoji}</span>
                   <span className="text-[8px] font-black uppercase">{m.label}</span>
                </button>
              ))}
           </div>
        </section>

        {/* Energy and Sleep (Sliders) */}
        <section className="space-y-8 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-[32px]">
           <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <p className="text-[10px] font-black uppercase tracking-widest">Nível de Energia</p>
                 <span className="text-lg font-black text-primary">{energy}</span>
              </div>
              <input 
                type="range" min="1" max="5" step="1" 
                value={energy} onChange={(e) => setEnergy(parseInt(e.target.value))}
                className="w-full accent-primary h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" 
              />
              <div className="flex justify-between text-[8px] font-bold text-gray-400">
                 <span>BAIXA</span>
                 <span>MÉDIA</span>
                 <span>ALTA</span>
              </div>
           </div>

           <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <p className="text-[10px] font-black uppercase tracking-widest">Qualidade do Sono</p>
                 <span className="text-lg font-black text-primary">{sleep}</span>
              </div>
              <input 
                type="range" min="1" max="5" step="1" 
                value={sleep} onChange={(e) => setSleep(parseInt(e.target.value))}
                className="w-full accent-primary h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" 
              />
              <div className="flex justify-between text-[8px] font-bold text-gray-400">
                 <span>RUIM</span>
                 <span>REGULAR</span>
                 <span>EXCELENTE</span>
              </div>
           </div>
        </section>

        {/* School Status */}
        <section className="space-y-3">
           <p className="text-[10px] font-black uppercase text-primary tracking-widest">Desempenho Escolar</p>
           <div className="grid grid-cols-2 gap-3">
              {['Tranquilo', 'Equilibrado', 'Desafiador', 'Falta de Foco'].map(opt => (
                <button 
                  key={opt}
                  onClick={() => setSchool(opt)}
                  className={`p-4 rounded-2xl border-2 text-xs font-bold text-left transition-all ${school === opt ? 'border-primary bg-primary/10 text-primary' : 'border-gray-50 dark:border-gray-800'}`}
                >
                   {opt}
                </button>
              ))}
           </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white dark:from-background-dark to-transparent z-50">
         <button 
           onClick={handleSave}
           disabled={saving}
           className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3"
         >
            {saving ? 'Salvando...' : 'Finalizar Check-in'}
            <span className="material-symbols-outlined">done_all</span>
         </button>
      </div>
    </div>
  );
};

export default CheckInPage;
