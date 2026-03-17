import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useSelectedChild } from '../contexts/SelectedChildContext';
import { fetchChildAlbum, ChildAlbumItem } from '../services/albumService';
import { storyService, Story } from '../services/storyService';
import { supabase } from '../services/supabase';

type Tab = 'characters' | 'rewards' | 'stories';

const AlbumPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedChild } = useSelectedChild();
  
  // State
  const tabParam = searchParams.get('tab') as Tab;
  const activeTab = (tabParam === 'characters' || tabParam === 'rewards' || tabParam === 'stories') ? tabParam : 'characters';

  const setActiveTab = (tab: Tab) => {
    setSearchParams({ tab });
  };

  const [loading, setLoading] = useState(true);
  
  // Data
  const [items, setItems] = useState<ChildAlbumItem[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);

  // Filter for Characters
  const [filter, setFilter] = useState<'all' | 'common' | 'rare' | 'epic'>('all');

  // Handle Hash Routing for Tabs (Sprint 9) - REMOVED in favor of searchParams
  // useEffect(() => {
  //   if (location.hash === '#/recompensas') setActiveTab('rewards');
  //   else if (location.hash === '#/livro') setActiveTab('stories');
  //   else setActiveTab('characters');
  // }, [location.hash]);

  // Fetch Data based on Active Tab
  useEffect(() => {
    if (!selectedChild) return;
    setLoading(true);

    const fetchData = async () => {
      try {
        if (activeTab === 'characters') {
          const data = await fetchChildAlbum(selectedChild.id);
          setItems(data);
        } else if (activeTab === 'stories') {
          const data = await storyService.getStories(selectedChild.id);
          setStories(data);
        } else if (activeTab === 'rewards') {
          // Fetch Rewards History (Games, Drawings, Stories)
          // 1. Child Daily Rewards (Games)
          const { data: dailyRewards } = await supabase
            .from('child_daily_rewards')
            .select('*')
            .eq('child_id', selectedChild.id)
            .order('used_at', { ascending: false });
          
          // 2. Activity Completions (Drawings & Stories)
          const { data: activities } = await supabase
            .from('activity_completions')
            .select('*')
            .eq('child_id', selectedChild.id)
            .in('activity_type', ['story_of_the_day', 'drawing_of_the_day']) // Assuming drawing type
            .order('completed_at', { ascending: false });

          // Merge and normalize
          const normalizedRewards = [
             ...(dailyRewards || []).map(r => ({
                id: r.id,
                type: r.reward_type, // 'game', etc.
                date: r.used_at,
                title: r.reward_type === 'game' ? 'Hora do Jogo' : 'Recompensa',
                icon: 'videogame_asset',
                color: 'text-green-500 bg-green-100'
             })),
             ...(activities || []).map(a => ({
                id: a.id,
                type: a.metadata?.type || 'story',
                date: a.completed_at,
                title: a.metadata?.title || (a.metadata?.type === 'story' ? 'História do Dia' : 'Desenho Mágico'),
                icon: a.metadata?.type === 'story' ? 'menu_book' : 'auto_awesome',
                color: a.metadata?.type === 'story' ? 'text-orange-500 bg-orange-100' : 'text-purple-500 bg-purple-100',
                payload: a.metadata
             }))
          ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          setRewards(normalizedRewards);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedChild, activeTab]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter(i => i.rarity === filter);
  }, [items, filter]);

  const stats = useMemo(() => ({
    characters: items.length,
    rewards: rewards.length,
    stories: stories.length
  }), [items, rewards, stories]);

  if (!selectedChild) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background-dark pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 p-6 pt-10">
        <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate('/dashboard')} className="size-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center active:scale-95 transition-all">
                <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-500 filled">emoji_events</span>
                Meu Álbum
            </h1>
            <div className="size-10"></div>
        </div>

        {/* Tabs (Sprint 9) */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4">
           {(['characters', 'rewards', 'stories'] as const).map(tab => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                 activeTab === tab 
                 ? 'bg-white dark:bg-surface-dark shadow-sm text-primary' 
                 : 'text-gray-400 hover:text-gray-600'
               }`}
             >
               {tab === 'characters' ? 'Personagens' : tab === 'rewards' ? 'Recompensas' : 'Livro'}
               {activeTab === tab && (
                  <span className="ml-1 text-[9px] opacity-70">
                     ({tab === 'characters' ? stats.characters : tab === 'rewards' ? stats.rewards : stats.stories})
                  </span>
               )}
             </button>
           ))}
        </div>

        {/* Stats Bar (Dynamic based on Tab) */}
        {activeTab === 'characters' && (
          <>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-3 flex flex-col items-center min-w-[80px]">
                    <span className="text-[10px] font-bold uppercase text-gray-500">Total</span>
                    <span className="text-xl font-black text-gray-900 dark:text-white">{items.length}</span>
                </div>
                <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-3 flex flex-col items-center min-w-[80px]">
                    <span className="text-[10px] font-bold uppercase text-blue-500">Raros</span>
                    <span className="text-xl font-black text-blue-700 dark:text-blue-300">{items.filter(i => i.rarity === 'rare').length}</span>
                </div>
                <div className="flex-1 bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-3 flex flex-col items-center min-w-[80px]">
                    <span className="text-[10px] font-bold uppercase text-purple-500">Épicos</span>
                    <span className="text-xl font-black text-purple-700 dark:text-purple-300">{items.filter(i => i.rarity === 'epic').length}</span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
                {['all', 'common', 'rare', 'epic'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${
                            filter === f 
                            ? 'bg-primary text-black shadow-md' 
                            : 'bg-white dark:bg-gray-800 text-gray-500 border border-gray-100 dark:border-gray-700'
                        }`}
                    >
                        {f === 'all' ? 'Todos' : f === 'common' ? 'Comuns' : f === 'rare' ? 'Raros' : 'Épicos'}
                    </button>
                ))}
            </div>
          </>
        )}
      </header>

      {/* Main Content */}
      <main className="p-6">
        {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <div className="size-10 border-4 border-gray-300 border-t-primary rounded-full animate-spin mb-4"></div>
                <p>Carregando...</p>
            </div>
        ) : (
          <>
            {/* CHARACTERS TAB */}
            {activeTab === 'characters' && (
               filteredItems.length === 0 ? (
                  <div className="text-center py-20">
                      <div className="size-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                          <span className="material-symbols-outlined text-5xl">grid_off</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nada por aqui ainda</h3>
                      <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mt-2">
                          Complete o Plano do Dia para ganhar seus primeiros personagens!
                      </p>
                      <button 
                          onClick={() => navigate('/plano-hoje')}
                          className="mt-6 px-6 py-3 bg-primary text-black font-bold rounded-xl shadow-glow active:scale-95 transition-all"
                      >
                          Ir para o Plano
                      </button>
                  </div>
               ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {filteredItems.map((item) => (
                          <div 
                              key={item.id} 
                              className={`bg-white dark:bg-surface-dark rounded-2xl p-4 border-2 shadow-sm flex flex-col items-center text-center relative overflow-hidden group transition-all hover:scale-105 ${
                                  item.rarity === 'rare' ? 'border-blue-100' : 
                                  item.rarity === 'epic' ? 'border-purple-100' : 'border-gray-100'
                              }`}
                          >
                              {/* Level Badge */}
                              <div className="absolute top-2 right-2 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-md text-[10px] font-black">
                                  LVL {item.level}
                              </div>

                              {/* Image */}
                              <div className="w-24 h-24 mb-3 relative">
                                  <img src={item.image_url} alt={item.name} className="w-full h-full object-contain drop-shadow-sm" />
                              </div>

                              {/* Info */}
                              <h4 className="font-bold text-gray-900 dark:text-white text-sm leading-tight mb-1">{item.name}</h4>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  item.rarity === 'rare' ? 'bg-blue-100 text-blue-600' : 
                                  item.rarity === 'epic' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
                              }`}>
                                  {item.rarity === 'common' ? 'Comum' : item.rarity === 'rare' ? 'Raro' : 'Épico'}
                              </span>
                              
                              {/* Progress Bar for next level (Mock visual) */}
                              <div className="w-full h-1 bg-gray-100 rounded-full mt-3 overflow-hidden">
                                  <div 
                                      className={`h-full ${item.level === 3 ? 'bg-green-500' : 'bg-yellow-400'}`} 
                                      style={{ width: `${(item.level / 3) * 100}%` }}
                                  ></div>
                              </div>
                          </div>
                      ))}
                  </div>
               )
            )}

            {/* REWARDS TAB (Sprint 9) */}
            {activeTab === 'rewards' && (
               rewards.length === 0 ? (
                  <div className="text-center py-20">
                      <div className="size-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-400">
                          <span className="material-symbols-outlined text-5xl">redeem</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">Nenhuma recompensa desbloqueada</h3>
                      <p className="text-gray-500 max-w-xs mx-auto mt-2">
                          Complete a rotina para ganhar momentos de diversão!
                      </p>
                  </div>
               ) : (
                  <div className="space-y-4">
                     {rewards.map((reward) => (
                        <div key={reward.id} className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                           <div className={`size-12 rounded-2xl flex items-center justify-center ${reward.color}`}>
                              <span className="material-symbols-outlined">{reward.icon}</span>
                           </div>
                           <div className="flex-1">
                              <h4 className="font-bold text-gray-900">{reward.title}</h4>
                              <p className="text-xs text-gray-500 capitalize">{new Date(reward.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                              
                              {/* Game Enabled Status (for Game Rewards) */}
                              {reward.type === 'game' && selectedChild.gameEnabled === false && (
                                <p className="text-[10px] text-red-500 font-bold uppercase mt-1">
                                  Bloqueado pelo responsável
                                </p>
                              )}
                           </div>
                           
                           {/* Action Buttons */}
                           {reward.type === 'story' && (
                              <button 
                                onClick={() => navigate('/student/stories')}
                                className="size-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 active:scale-95 hover:bg-orange-100 hover:text-orange-500 transition-all"
                                title="Ler histórias"
                              >
                                 <span className="material-symbols-outlined">arrow_forward</span>
                              </button>
                           )}

                           {reward.type === 'game' && (
                              <button 
                                onClick={() => {
                                  if (selectedChild.gameEnabled === false) {
                                    alert('A Hora do Jogo está pausada pelos seus responsáveis.');
                                    return;
                                  }
                                  navigate('/hora-do-jogo', { state: { child: selectedChild } });
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all shadow-sm ${
                                  selectedChild.gameEnabled === false
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-green-500 text-white shadow-green-200 active:scale-95 hover:bg-green-600'
                                }`}
                              >
                                {selectedChild.gameEnabled === false ? 'Bloqueado' : 'Jogar'}
                              </button>
                           )}
                        </div>
                     ))}
                  </div>
               )
            )}

            {/* STORIES TAB (Sprint 9) */}
            {activeTab === 'stories' && (
               stories.length === 0 ? (
                  <div className="text-center py-20">
                      <div className="size-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-400">
                          <span className="material-symbols-outlined text-5xl">menu_book</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">Seu livro está vazio</h3>
                      <p className="text-gray-500 max-w-xs mx-auto mt-2">
                          Ainda não há histórias salvas. Conclua uma missão e gere sua primeira história.
                      </p>
                  </div>
               ) : (
                  <div className="space-y-4">
                     {stories.map((story) => (
                        <div 
                          key={story.id}
                          onClick={() => navigate('/student/stories')} // Navigate to full reader
                          className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border-l-4 border-orange-400 flex gap-4 cursor-pointer hover:bg-orange-50/50 transition-colors group"
                        >
                           <div className="size-16 bg-orange-100 rounded-xl flex items-center justify-center text-orange-500 shrink-0">
                              <span className="material-symbols-outlined text-2xl">auto_stories</span>
                           </div>
                           <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-900 truncate group-hover:text-orange-600 transition-colors">{story.title}</h4>
                              <p className="text-xs text-gray-500 line-clamp-2 mt-1">{story.content}</p>
                              <div className="flex items-center gap-2 mt-2">
                                 <span className="text-[10px] font-bold uppercase bg-gray-100 px-2 py-0.5 rounded text-gray-500">
                                    {new Date(story.created_at).toLocaleDateString('pt-BR')}
                                 </span>
                              </div>
                           </div>
                           <div className="self-center">
                              <span className="material-symbols-outlined text-gray-300 group-hover:text-orange-400">chevron_right</span>
                           </div>
                        </div>
                     ))}
                  </div>
               )
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default AlbumPage;
