import React from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis, CartesianGrid, Tooltip, XAxis } from 'recharts';
import { ProgressTimelineItem } from '../../services/progressService';

interface Props {
  data: ProgressTimelineItem[];
}

export const ProgressChart: React.FC<Props> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-400">Complete atividades para ver seu gráfico de evolução!</p>
      </div>
    );
  }

  // Format date for display
  const formattedData = data.map(item => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }));

  return (
    <div className="bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm">
      <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">ssid_chart</span>
        Evolução de XP
      </h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData}>
            <defs>
              <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#13eca4" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#13eca4" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis 
              dataKey="displayDate" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9ca3af' }} 
              dy={10}
            />
            <YAxis 
              hide={true} 
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
              cursor={{ stroke: '#13eca4', strokeWidth: 2 }}
            />
            <Area 
              type="monotone" 
              dataKey="total_xp" 
              stroke="#13eca4" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorXp)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
