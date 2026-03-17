import React, { useEffect, useState } from 'react';
import { fetchDashboardStats, fetchDashboardCharts, fetchOperationalData, fetchAttentionUsers } from '../adminData';
import DashboardKPIs from '../components/DashboardKPIs';
import DashboardCharts from '../components/DashboardCharts';
import DashboardOperations from '../components/DashboardOperations';
import DashboardAttention from '../components/DashboardAttention';

type Props = {
  onNavigateToUser: (userId: string) => void;
};

const DashboardTab: React.FC<Props> = ({ onNavigateToUser }) => {
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('7d');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [opsData, setOpsData] = useState<any>(null);
  const [attentionData, setAttentionData] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const end = now.toISOString();
      const start = new Date();
      
      if (period === 'today') start.setHours(0, 0, 0, 0);
      else if (period === '7d') start.setDate(now.getDate() - 7);
      else if (period === '30d') start.setDate(now.getDate() - 30);
      
      const startIso = start.toISOString();

      // Previous period for delta
      const prevEnd = new Date(start);
      const prevStart = new Date(prevEnd);
      if (period === 'today') prevStart.setDate(prevStart.getDate() - 1);
      else if (period === '7d') prevStart.setDate(prevStart.getDate() - 7);
      else if (period === '30d') prevStart.setDate(prevStart.getDate() - 30);

      const [s, c, o, a] = await Promise.all([
        fetchDashboardStats(startIso, end, prevStart.toISOString(), prevEnd.toISOString()),
        fetchDashboardCharts(startIso, end),
        fetchOperationalData(),
        fetchAttentionUsers()
      ]);

      setStats(s);
      setCharts(c);
      setOpsData(o);
      setAttentionData(a);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Topbar Controls */}
      <div className="flex justify-between items-center bg-white dark:bg-surface-dark p-2 rounded-2xl border border-gray-100 dark:border-gray-800 w-fit">
        {(['today', '7d', '30d'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              period === p ? 'bg-black text-white' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {p === 'today' ? 'Hoje' : p === '7d' ? '7 Dias' : '30 Dias'}
          </button>
        ))}
      </div>

      <DashboardKPIs stats={stats} loading={loading} />
      <DashboardCharts charts={charts} loading={loading} />
      <DashboardOperations data={opsData} loading={loading} />
      <DashboardAttention data={attentionData} loading={loading} onSelectUser={onNavigateToUser} />
    </div>
  );
};

export default DashboardTab;
