import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getEntitlements } from '../billing/entitlements';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ isOpen, onClose, featureName }) => {
  const navigate = useNavigate();
  const entitlements = getEntitlements('PRO'); // Show what PRO offers

  if (!isOpen) return null;

  // Custom reason mapping based on feature or hardcoded rules
  let reasonText = "";
  if (featureName === 'Correção por Foto') {
    reasonText = "Seu plano Free permite 1 correção de foto por semana. No Pro, as correções são ilimitadas.";
  } else if (featureName === 'Relatórios Avançados') {
     reasonText = "Seu plano Free tem acesso a relatórios básicos. No Pro, os relatórios são detalhados.";
  } else if (featureName === 'Impressão de Atividades') {
     reasonText = "A impressão de atividades em PDF é exclusiva do Plano Pro.";
  } else if (featureName === 'Limite de Estudantes') {
     reasonText = "O plano Free permite apenas 1 estudante. Faça upgrade para adicionar estudantes ilimitados.";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-slide-up border border-gray-100 dark:border-gray-800">
        
        <div className="p-8">
           <div className="flex justify-end">
              <button 
                onClick={onClose}
                className="size-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
           </div>

           <div className="text-center mb-8">
              <div className="size-16 bg-primary/20 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                 <span className="material-symbols-outlined text-3xl">lock_open</span>
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 leading-tight">
                Desbloqueie o Educa Sense Pro
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                Potencialize o aprendizado com ferramentas exclusivas para pais e professores.
              </p>
           </div>

           {reasonText && (
             <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 rounded-xl flex items-start gap-3">
                <span className="material-symbols-outlined text-orange-500 shrink-0">info</span>
                <p className="text-xs font-bold text-orange-800 dark:text-orange-200 leading-relaxed">
                  {reasonText}
                </p>
             </div>
           )}

           <ul className="space-y-4 mb-8">
             {entitlements.features?.map((item, i) => (
               <li key={i} className="flex items-center gap-3 text-sm font-bold text-gray-700 dark:text-gray-300">
                 <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                 {item}
               </li>
             ))}
           </ul>

           <div className="space-y-4">
             <button
               onClick={() => {
                 onClose();
                 navigate('/assinatura');
               }}
               className="w-full py-4 bg-primary text-black font-black rounded-xl text-sm uppercase tracking-wider shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all"
             >
               Assinar Agora
             </button>
             <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
               Cancele quando quiser. Sem fidelidade.
             </p>
           </div>
        </div>
      </div>
    </div>
  );
};
