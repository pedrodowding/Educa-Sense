import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelectedChild } from '../contexts/SelectedChildContext';
import { fetchChildAlbum } from '../services/albumService';

export const AlbumStatusCard: React.FC = () => {
  const navigate = useNavigate();
  const { selectedChild } = useSelectedChild();
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    if (selectedChild) {
      fetchChildAlbum(selectedChild.id).then(items => {
        setTotalItems(items.length);
      });
    }
  }, [selectedChild]);

  if (!selectedChild) return null;

  return (
    <button 
      onClick={() => navigate('/meu-album')}
      className="w-full bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 p-5 rounded-[24px] border border-yellow-100 dark:border-yellow-900/30 shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-between group mb-4"
    >
      <div className="flex items-center gap-4">
         <div className="size-12 bg-white dark:bg-surface-dark rounded-2xl flex items-center justify-center text-yellow-500 shadow-sm group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-2xl filled">emoji_events</span>
         </div>
         <div className="text-left">
            <h4 className="font-black text-base text-gray-900 dark:text-white mb-0.5">Meu Álbum</h4>
            <p className="text-xs text-gray-500 font-medium">
               {totalItems === 0 
                 ? "Complete o plano para ganhar!" 
                 : `${totalItems} personagens colecionados`
               }
            </p>
         </div>
      </div>
      
      <div className="size-8 rounded-full bg-white dark:bg-surface-dark flex items-center justify-center text-gray-400 group-hover:text-yellow-500 transition-colors">
         <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
      </div>
    </button>
  );
};
