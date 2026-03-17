import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserTier, getUsage, getEntitlements } from '../billing/entitlements';

export const PlanStatusCard: React.FC = () => {
  const navigate = useNavigate();
  const [tier, setTier] = useState(getUserTier());
  const [photoUsage, setPhotoUsage] = useState(0);
  const entitlements = getEntitlements(tier);

  useEffect(() => {
    // Refresh tier/usage on mount
    setTier(getUserTier());
    setPhotoUsage(getUsage('photo_correction_limit_per_week'));

    // Optional: Listen for storage events if needed, but for now mount is enough
    const handleStorage = () => {
       setTier(getUserTier());
       setPhotoUsage(getUsage('photo_correction_limit_per_week'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const isFree = tier === 'FREE';

  if (isFree) {
    return (
      <div className="bg-white dark:bg-surface-dark rounded-[24px] p-6 border border-gray-100 dark:border-gray-800 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-gray-900 dark:text-white">Quer desbloquear mais recursos?</h3>
        </div>

        <ul className="space-y-3 mb-6">
          {/* Show features from Free plan or teaser of Pro? 
              Request: "Atualizar o card do dashboard para usar exatamente esses textos."
              If Free, show Free features? Or show Pro features to upsell?
              The request says: "Plano Grátis: ... Plano Premium: ..."
              "Usar essa lista como fonte única de verdade."
              
              Let's show the CURRENT plan features if Free, but the title says "Quer desbloquear...?"
              Actually, usually a status card shows what you HAVE. 
              But the previous instruction D) said: "No Free: mostrar CTA."
              And "O card deve refletir exatamente: benefícios do Free... benefícios do Pro".
              
              If I show Free features, the title "Quer desbloquear mais recursos?" is weird if I list Free stuff.
              Maybe the title should be "Plano Atual: Grátis" and list Free stuff, THEN upsell?
              
              The prompt says: "Atualizar o card do dashboard para usar exatamente esses textos."
              Let's follow the entitlements source of truth.
          */}
          {entitlements.features?.map((feature, idx) => (
            <li key={idx} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
              <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <button 
          onClick={() => navigate('/assinatura')}
          className="w-full py-4 bg-primary text-black font-black rounded-xl text-sm uppercase tracking-wider shadow-glow active:scale-95 transition-all hover:brightness-110"
        >
          Desbloquear Educa Sense Pro
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black text-white rounded-[24px] p-6 shadow-glow mb-6 relative overflow-hidden">
       <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black">Plano atual</h3>
            <span className="bg-primary text-black px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">verified</span>
              Pro
            </span>
          </div>

          <p className="text-lg font-black text-white mb-6">Você está no Pro ✅</p>

          <ul className="space-y-3 mb-6">
            {entitlements.features?.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-3 text-sm text-gray-300">
                <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
       </div>
       
       {/* Decor */}
       <div className="absolute top-0 right-0 size-64 bg-primary/10 blur-[80px] rounded-full translate-x-20 -translate-y-20 pointer-events-none" />
    </div>
  );
};
