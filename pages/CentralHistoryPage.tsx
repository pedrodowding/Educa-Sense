import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSelectedChild } from '../contexts/SelectedChildContext';

type Tab = 'activity' | 'drawing' | 'creative_mission';

interface HistoryItem {
  id: string;
  type: Tab;
  program: string;
  title: string;
  summary: string;
  score: number;
  xp: number;
  created_at: string;
  asset_url: string;
  status: string;
  result_json: any;
}

const CentralHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedChild } = useSelectedChild();
  
  const [activeTab, setActiveTab] = useState<Tab>('activity');
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user, activeTab, period, selectedChild]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('learning_history')
        .select('*')
        .eq('user_id', user!.id)
        .eq('type', activeTab)
        .order('created_at', { ascending: false });

      // Filter by child if selected
      if (selectedChild) {
        query = query.eq('child_id', selectedChild.id);
      }

      // Filter by period
      if (period !== 'all') {
        const days = period === '7d' ? 7 : 30;
        const date = new Date();
        date.setDate(date.getDate() - days);
        query = query.gte('created_at', date.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Stats Calculation
  const stats = useMemo(() => {
    const totalXP = items.reduce((acc, curr) => acc + (curr.xp || 0), 0);
    const scores = items.filter(i => i.score != null).map(i => i.score);
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-';
    return { totalXP, avgScore, count: items.length };
  }, [items]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background-dark pb-20">
      {/* Header */}
      <header className="bg-white dark:bg-surface-dark shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">Histórico de Aprendizado</h1>
          </div>
          
          {/* Period Filter (Simple) */}
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value as any)}
            className="bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-xs font-bold py-2 pl-3 pr-8"
          >
            <option value="7d">7 dias</option>
            <option value="30d">30 dias</option>
            <option value="all">Tudo</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-4 overflow-x-auto no-scrollbar border-b border-gray-100 dark:border-gray-800">
          {(['activity', 'drawing', 'creative_mission'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-2 text-sm font-bold uppercase tracking-wide whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab === 'activity' ? 'Atividades' : tab === 'drawing' ? 'Desenhos' : 'Missões'}
            </button>
          ))}
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto space-y-6">
        
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4">
           <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm text-center">
              <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">XP Ganho</p>
              <p className="text-2xl font-black text-yellow-500">+{stats.totalXP}</p>
           </div>
           {activeTab === 'activity' && (
             <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm text-center">
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Média</p>
                <p className="text-2xl font-black text-primary">{stats.avgScore}</p>
             </div>
           )}
           <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm text-center">
              <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Itens</p>
              <p className="text-2xl font-black text-gray-800 dark:text-white">{stats.count}</p>
           </div>
        </div>

        {/* Content List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin size-10 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 opacity-50">
            <span className="material-symbols-outlined text-6xl text-gray-300">history_edu</span>
            <p className="mt-4 font-bold text-gray-400">Nenhum registro encontrado.</p>
          </div>
        ) : (
          <div className={activeTab === 'drawing' ? "grid grid-cols-2 md:grid-cols-3 gap-4" : "space-y-3"}>
            {items.map(item => (
              <HistoryCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

const HistoryCard: React.FC<{ item: HistoryItem }> = ({ item }) => {
  const getIcon = () => {
    if (item.type === 'activity') return 'school';
    if (item.type === 'drawing') return 'palette';
    return 'auto_awesome';
  };

  const getColor = () => {
    if (item.type === 'activity') return 'bg-blue-100 text-blue-600';
    if (item.type === 'drawing') return 'bg-purple-100 text-purple-600';
    return 'bg-pink-100 text-pink-600';
  };

  if (item.type === 'drawing' && item.asset_url) {
    return (
      <div className="bg-white dark:bg-surface-dark rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
        <div className="aspect-square bg-gray-100 relative">
          <img src={item.asset_url} alt={item.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
             <button onClick={() => window.open(item.asset_url, '_blank')} className="bg-white text-black rounded-full p-2">
                <span className="material-symbols-outlined">visibility</span>
             </button>
          </div>
        </div>
        <div className="p-3">
           <h3 className="font-bold text-xs truncate">{item.title}</h3>
           <p className="text-[10px] text-gray-400">{new Date(item.created_at).toLocaleDateString()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm flex items-center gap-4">
      <div className={`size-12 rounded-2xl flex items-center justify-center ${getColor()}`}>
        <span className="material-symbols-outlined">{getIcon()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
           <h3 className="font-bold text-gray-900 dark:text-white truncate pr-2">{item.title || 'Atividade'}</h3>
           {item.score != null && (
             <span className={`text-xs font-black px-2 py-1 rounded-md ${item.score >= 7 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
               {item.score.toFixed(1)}
             </span>
           )}
        </div>
        <p className="text-xs text-gray-500 truncate mt-1">{item.summary || item.program}</p>
        <div className="flex items-center gap-3 mt-2">
           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
             <span className="material-symbols-outlined text-[10px]">calendar_today</span>
             {new Date(item.created_at).toLocaleDateString()}
           </span>
           {item.xp > 0 && (
             <span className="text-[10px] font-bold text-yellow-600 flex items-center gap-1">
               <span className="material-symbols-outlined text-[10px]">bolt</span>
               +{item.xp} XP
             </span>
           )}
        </div>
      </div>
      
      {item.asset_url && (
         <div className="size-16 rounded-xl bg-gray-100 overflow-hidden shrink-0">
            <img src={item.asset_url} className="w-full h-full object-cover" alt="Preview" />
         </div>
      )}
    </div>
  );
};

export default CentralHistoryPage;
