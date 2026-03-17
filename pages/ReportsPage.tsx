import React, { useState } from 'react';
import { Exercise, Child } from '../types';
import { useSelectedChild } from '../contexts/SelectedChildContext';
import { Entitlements } from '../billing/entitlements';
import { PaywallModal } from '../components/PaywallModal';
import { StudentProgressDashboard } from '../components/dashboard/StudentProgressDashboard';

interface Props {
  history: Exercise[];
  children: Child[];
}

const ReportsPage: React.FC<Props> = ({ children }) => {
  const { selectedChild, setSelectedChild } = useSelectedChild();
  const [showPaywall, setShowPaywall] = useState(false);
  const canViewAdvanced = Entitlements.isFeatureAllowed('can_view_advanced_reports');
  
  const activeChild = selectedChild || (children.length > 0 ? children[0] : undefined);

  return (
    <div className="flex flex-col min-h-full pb-10">
      <header className="p-6 pt-10 space-y-6">
        <div>
           <h1 className="text-3xl font-black text-primary leading-none">Relatórios</h1>
           <p className="text-xs font-bold text-text-sub uppercase tracking-[3px] mt-1">Evolução Detalhada</p>
        </div>

        {/* Child Selector */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
           {children.map(c => (
             <button 
               key={c.id}
               onClick={() => setSelectedChild(c)}
               className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 shrink-0 transition-all ${activeChild?.id === c.id ? 'border-primary bg-primary/10' : 'border-gray-100 opacity-50'}`}
             >
                <img src={c.avatar} alt={c.name} className="size-6 rounded-full" />
                <span className="text-xs font-bold">{c.name}</span>
             </button>
           ))}
        </div>
      </header>

      <main className="px-6">
        <StudentProgressDashboard 
          isPremium={canViewAdvanced} 
          onUnlock={() => setShowPaywall(true)}
        />
      </main>
      
      <PaywallModal 
        isOpen={showPaywall} 
        onClose={() => setShowPaywall(false)} 
        featureName="Relatórios Avançados"
      />
    </div>
  );
};

export default ReportsPage;
