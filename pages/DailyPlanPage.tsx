import React, { useState, useEffect } from 'react';
import { getLocalDateISOString } from '../utils/dateUtils';
import { useNavigate } from 'react-router-dom';
import { useSelectedChild } from '../contexts/SelectedChildContext';
import { useChildren } from '../hooks/useChildren';
import { useBehavior } from '../hooks/useBehavior';
import { useDailyProgress } from '../hooks/useDailyProgress';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Entitlements } from '../billing/entitlements';
import { PaywallModal } from '../components/PaywallModal';
import { claimDailyAlbumReward, AlbumItem } from '../services/albumService';
import AlbumRewardModal from '../components/AlbumRewardModal';

const DailyPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { children } = useChildren();
  const { selectedChild, setSelectedChild } = useSelectedChild();
  const { dailyState, refresh: refreshDaily, loading } = useDailyProgress();
  const { addCheckIn } = useBehavior();
  
  // Local state for Step 1 inline form
  const [mood, setMood] = useState<'feliz' | 'ok' | 'triste' | undefined>(undefined);
  const [sleep, setSleep] = useState<'bom' | 'medio' | 'ruim' | undefined>(undefined);
  
  // Local state for Step 3
  const [loadingStep3, setLoadingStep3] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Reward State
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardData, setRewardData] = useState<{item: AlbumItem, level: number, isNew: boolean} | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  // Local state for feedback toast
  const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);

  // Optimistic UI state
  const [optimisticSteps, setOptimisticSteps] = useState<[boolean, boolean, boolean] | null>(null);
  
  // Sync optimistic state with real state, but prioritize optimistic if set
  const currentSteps = optimisticSteps || dailyState?.steps_completed || [false, false, false];
  const currentCount = currentSteps.filter(Boolean).length;
  
  useEffect(() => {
    if (dailyState) {
      // Only sync if optimistic matches or is null (to avoid reverting during fetch)
      // Actually, if dailyState updates, it should be the source of truth, unless we are waiting for it.
      // We'll reset optimistic steps when dailyState changes to match our expectation.
      // But simple "optimistic" means we set it locally immediately.
      if (optimisticSteps) {
          // Check if real state caught up
          const realCount = dailyState.steps_completed.filter(Boolean).length;
          const optCount = optimisticSteps.filter(Boolean).length;
          if (realCount === optCount) {
              setOptimisticSteps(null);
          }
      }
    }
  }, [dailyState]);

  const showFeedback = (msg: string) => {
      setShowToast({ message: msg, type: 'success' });
      setTimeout(() => setShowToast(null), 3000);
  };

  useEffect(() => {
    if (dailyState) {
      // Pre-fill form if data exists
      if (dailyState.mood) setMood(dailyState.mood as any);
      if (dailyState.sleep) setSleep(dailyState.sleep as any);
    }
  }, [dailyState]);


  useEffect(() => {
    // Check completion and trigger reward
    const checkAndClaim = async () => {
        if (dailyState?.steps_completed.every(Boolean) && dailyState.status === 'done' && selectedChild && !isClaiming && !rewardData) {
           setIsClaiming(true);
           
           // Small delay for UX (see the checks turning green)
           await new Promise(r => setTimeout(r, 1000));

           const result = await claimDailyAlbumReward(selectedChild.id);
           
           if (result && result.ok) {
               setRewardData({
                   item: result.item,
                   level: result.level,
                   isNew: result.is_new
               });
               setShowRewardModal(true);
           } else {
               // If failed or no item (shouldn't happen with seed), just go to summary
               navigate('/resumo-hoje');
           }
           setIsClaiming(false);
        }
    };

    checkAndClaim();
  }, [dailyState, selectedChild]);

  // Handle Modal Close
  const handleRewardClose = () => {
      setShowRewardModal(false);
      navigate('/resumo-hoje');
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Carregando plano...</div>;
  }

  if (!selectedChild) {
    return (
      <div className="p-8 text-center">
        <p className="mb-4">Selecione uma criança para começar o plano diário.</p>
        {children.length > 0 ? (
           <div className="flex gap-2 justify-center">
               {children.map(c => (
                   <button key={c.id} onClick={() => setSelectedChild(c)} className="p-2 border rounded-lg">
                       {c.name}
                   </button>
               ))}
           </div>
        ) : (
            <button 
            onClick={() => navigate('/settings')}
            className="bg-primary text-white px-4 py-2 rounded-lg"
            >
            Adicionar Criança
            </button>
        )}
      </div>
    );
  }

  const handleStep1Complete = async () => {
    if (!mood || !sleep) return;
    
    // Optimistic Update
    setOptimisticSteps([true, currentSteps[1], currentSteps[2]]);
    showFeedback("Boa! Vamos para o próximo 🚀");

    const apiMood = mood === 'ok' ? 'calmo' : mood; 
    const apiSleep = sleep === 'bom' ? 5 : sleep === 'medio' ? 3 : 1;

    await addCheckIn({
       id: '', 
       childId: selectedChild.id,
       date: getLocalDateISOString(),
       mood: apiMood as any,
       sleepQuality: apiSleep,
       energy: 3,
       schoolStatus: '',
       event: ''
    });

    await refreshDaily();
  };

  const handleStep2Click = () => {
    // Navigate to existing activity flow
    navigate('/exercicio-facil/criar');
  };
  
  const handleStep3Complete = async () => {
    if (!selectedChild || !user) return;
    
    // Optimistic Update
    setOptimisticSteps([currentSteps[0], currentSteps[1], true]);
    showFeedback("Muito bem! Você é incrível ⭐");
    setLoadingStep3(true);
    
    try {
      const today = getLocalDateISOString();
      
      // Use activity_id with a valid UUID. We can't use a string like 'creative-light-' + today if the column is UUID type.
      // However, we need a way to check if this specific daily activity was done.
      // Strategy: Instead of forcing a custom ID, let Supabase generate it (omit ID), 
      // AND use the query to find if a record exists for this child + date + type.
      
      const { data: existing } = await supabase
        .from('activity_completions')
        .select('id')
        .eq('child_id', selectedChild.id)
        .eq('completed_date', today)
        .eq('activity_type', 'creative_light')
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase.from('activity_completions').insert({
           parent_id: user.id,
           child_id: selectedChild.id,
           // Let DB generate UUID for activity_id or use a dummy valid UUID if it's a foreign key (assuming it's not strictly enforced FK to another table for this type)
           // If activity_id expects a UUID, we can't put arbitrary string.
           // Since this is an "offline" activity without a real record in an activities table, we might need to generate a random UUID 
           // OR if activity_id is not required/nullable, omit it. 
           // Assuming activity_id IS required and UUID type (common pattern), let's generate one deterministically or random.
           // Better: Use a NIL UUID or a specific constant UUID for "Daily Creative Light" if we want to group them, 
           // OR just random UUID since we filter by type/date.
           activity_id: crypto.randomUUID(), // Valid UUID v4
           activity_type: 'creative_light',
           completed_at: new Date(),
           completed_date: today,
           metadata: {
             type: 'offline_drawing',
             completed: true,
             custom_id: 'creative-light-' + today // Store the readable ID in metadata
           }
        });
        if (error) throw error;
      }

      await refreshDaily();
    } catch (e) {
      console.error(e);
      alert('Erro ao concluir atividade. Tente novamente.');
    } finally {
      setLoadingStep3(false);
    }
  };

  const handleStep3Bonus = () => {
    if (!Entitlements.canPerformAction('artes_criativas_per_day_limit') && Entitlements.getUserTier() !== 'PRO') {
       setShowPaywall(true);
       return;
    }
    navigate('/artes-criativas');
  };

  // const stepsCount = dailyState?.stepsCount || 0; // REPLACED by currentCount

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {showPaywall && <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />}
      
      {/* Toast Feedback */}
      {showToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
              <div className="bg-green-500 text-white px-6 py-3 rounded-full font-black text-sm shadow-xl flex items-center gap-2">
                  <span className="material-symbols-outlined filled">star</span>
                  {showToast.message}
              </div>
          </div>
      )}

      {/* Reward Modal */}
      {rewardData && (
          <AlbumRewardModal 
            isOpen={showRewardModal} 
            onClose={handleRewardClose} 
            item={rewardData.item} 
            level={rewardData.level} 
            isNew={rewardData.isNew} 
          />
      )}

      {/* Header */}
      <header className="bg-white sticky top-0 z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="text-gray-400">
                <span className="material-symbols-outlined">arrow_back_ios_new</span>
            </button>
            <div>
                <h1 className="text-lg font-black text-gray-900 leading-tight">Plano de hoje</h1>
                <p className="text-xs font-medium text-gray-500">
                    {currentCount === 3 ? "Tudo concluído! 🎉" : "Vamos completar?"}
                </p>
            </div>
        </div>
        
        <div className="flex flex-col items-end">
             <span className="text-xs font-bold text-gray-400 mb-1">Hoje: {currentCount}/3</span>
             <div className="flex gap-1">
                {[0, 1, 2].map((step) => (
                    <div 
                      key={step} 
                      className={`h-1.5 w-4 rounded-full transition-colors ${
                        currentCount > step ? 'bg-green-500' : 'bg-gray-200'
                      }`} 
                    />
                ))}
             </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        
        {/* Step 1: Check-in Rápido */}
        <section className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-colors ${currentSteps[0] ? 'border-green-100' : 'border-transparent'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`size-8 rounded-full flex items-center justify-center font-bold text-sm ${currentSteps[0] ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
                        {currentSteps[0] ? <span className="material-symbols-outlined text-lg">check</span> : '1'}
                    </div>
                    <h2 className="font-bold text-gray-800">Check-in rápido <span className="text-xs font-normal text-gray-400 ml-1">(30s)</span></h2>
                </div>
                {currentSteps[0] && <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-md">+5 XP</span>}
            </div>

            {currentSteps[0] ? (
                <div className="bg-green-50 text-green-800 p-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-fade-in">
                    <span className="material-symbols-outlined">sentiment_satisfied</span>
                    Pronto! Você já fez o check-in.
                </div>
            ) : (
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Como você está?</label>
                        <div className="flex gap-2">
                            {(['feliz', 'ok', 'triste'] as const).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMood(m)}
                                    className={`flex-1 py-2 rounded-xl border-2 font-medium text-sm transition-all ${mood === m ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400'}`}
                                >
                                    {m === 'feliz' && '😄'}
                                    {m === 'ok' && '😐'}
                                    {m === 'triste' && '😢'}
                                    <span className="ml-2 capitalize">{m}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Como dormiu?</label>
                        <div className="flex gap-2">
                             {(['bom', 'medio', 'ruim'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setSleep(s)}
                                    className={`flex-1 py-2 rounded-xl border-2 font-medium text-sm transition-all ${sleep === s ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400'}`}
                                >
                                    {s === 'bom' && '⚡'}
                                    {s === 'medio' && '☁️'}
                                    {s === 'ruim' && '💤'}
                                    <span className="ml-2 capitalize">{s === 'medio' ? 'médio' : s}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        disabled={!mood || !sleep}
                        onClick={handleStep1Complete}
                        className="w-full bg-black text-white py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all shadow-lg"
                    >
                        Terminei! 🎉
                    </button>
                </div>
            )}
        </section>

        {/* Step 2: Aprendizado */}
        <section className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-colors ${currentSteps[1] ? 'border-green-100' : 'border-transparent'} ${!currentSteps[0] ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`size-8 rounded-full flex items-center justify-center font-bold text-sm ${currentSteps[1] ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
                        {currentSteps[1] ? <span className="material-symbols-outlined text-lg">check</span> : '2'}
                    </div>
                    <h2 className="font-bold text-gray-800">Aprendizado <span className="text-xs font-normal text-gray-400 ml-1">(7 min)</span></h2>
                </div>
                {currentSteps[1] && <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-md">+15 XP</span>}
            </div>

            {currentSteps[1] ? (
                 <div className="bg-green-50 text-green-800 p-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-fade-in">
                    <span className="material-symbols-outlined">school</span>
                    Boa! Atividade completa.
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-sm text-gray-600 leading-relaxed">
                        Hora de praticar! Complete um exercício rápido.
                    </p>
                    <button 
                        onClick={handleStep2Click}
                        className="w-full bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-primary/30"
                    >
                        <span className="material-symbols-outlined">play_circle</span>
                        Começar
                    </button>
                </div>
            )}
        </section>

        {/* Step 3: Criativo Leve */}
        <section className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-colors ${currentSteps[2] ? 'border-green-100' : 'border-transparent'} ${!currentSteps[1] ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`size-8 rounded-full flex items-center justify-center font-bold text-sm ${currentSteps[2] ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
                        {currentSteps[2] ? <span className="material-symbols-outlined text-lg">check</span> : '3'}
                    </div>
                    <h2 className="font-bold text-gray-800">Criativo leve <span className="text-xs font-normal text-gray-400 ml-1">(3 min)</span></h2>
                </div>
                {currentSteps[2] && <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-md">+10 XP</span>}
            </div>

            {currentSteps[2] ? (
                 <div className="bg-green-50 text-green-800 p-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-fade-in">
                    <span className="material-symbols-outlined">palette</span>
                    Mandou bem! Criatividade liberada.
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <p className="text-sm text-gray-700 font-bold mb-1">
                            <span className="material-symbols-outlined align-bottom text-lg mr-1 text-purple-500">draw</span>
                            Pegue papel e lápis e faça um desenho rápido.
                        </p>
                        <ul className="text-xs text-gray-500 list-disc list-inside ml-1 space-y-1">
                            <li>Sugestão 1: Desenhe seu animal favorito</li>
                            <li>Sugestão 2: Desenhe algo que você viu hoje</li>
                        </ul>
                    </div>

                    <button 
                        onClick={handleStep3Complete}
                        disabled={loadingStep3}
                        className="w-full bg-purple-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-50"
                    >
                        {loadingStep3 ? (
                            <span className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                            <span className="material-symbols-outlined">check_circle</span>
                        )}
                        Já fiz! 🎉
                    </button>
                    
                    <button 
                        onClick={handleStep3Bonus}
                        className="w-full text-xs font-bold text-purple-400 py-2 hover:bg-purple-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        Gerar desenho para colorir (Bônus)
                    </button>
                </div>
            )}
        </section>

      </main>
    </div>
  );
};

export default DailyPlanPage;
