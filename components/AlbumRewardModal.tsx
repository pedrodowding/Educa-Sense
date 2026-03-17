import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlbumItem } from '../services/albumService';

interface AlbumRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: AlbumItem;
  level: number;
  isNew: boolean;
}

const AlbumRewardModal: React.FC<AlbumRewardModalProps> = ({ isOpen, onClose, item, level, isNew }) => {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
    } else {
      setTimeout(() => setShow(false), 300);
    }
  }, [isOpen]);

  if (!show && !isOpen) return null;

  const rarityColors = {
    common: 'bg-gray-100 text-gray-600 border-gray-200',
    rare: 'bg-blue-100 text-blue-600 border-blue-200',
    epic: 'bg-purple-100 text-purple-600 border-purple-200'
  };

  const rarityLabels = {
    common: 'Comum',
    rare: 'Raro',
    epic: 'Épico'
  };

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`relative w-full max-w-sm bg-white dark:bg-surface-dark rounded-[32px] p-6 text-center transform transition-all duration-500 ${isOpen ? 'scale-100 translate-y-0' : 'scale-90 translate-y-10'}`}>
        
        {/* Header Animation */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
            <div className="size-24 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <span className="material-symbols-outlined text-5xl text-white">emoji_events</span>
            </div>
        </div>

        <div className="mt-12 space-y-4">
            <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Parabéns!</h2>
                <p className="text-gray-500">Você completou o plano de hoje!</p>
            </div>

            {/* Card do Item */}
            <div className={`relative p-6 rounded-3xl border-4 ${rarityColors[item.rarity]} bg-white shadow-xl rotate-1`}>
                {isNew && (
                    <div className="absolute -top-3 -right-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-black uppercase shadow-md animate-pulse">
                        Novo!
                    </div>
                )}
                {!isNew && (
                    <div className="absolute -top-3 -right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-black uppercase shadow-md">
                        Level Up!
                    </div>
                )}

                <img src={item.image_url} alt={item.name} className="w-32 h-32 object-contain mx-auto mb-4 drop-shadow-md" />
                
                <h3 className="text-xl font-black text-gray-800">{item.name}</h3>
                <div className="flex justify-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${rarityColors[item.rarity]}`}>
                        {rarityLabels[item.rarity]}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-gray-100 text-gray-600 border border-gray-200">
                        Nível {level}
                    </span>
                </div>
            </div>

            <p className="text-sm text-gray-400 italic">Volte amanhã para ganhar mais!</p>

            <div className="grid grid-cols-2 gap-3 mt-6">
                <button 
                    onClick={() => { onClose(); navigate('/meu-album'); }}
                    className="py-3 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl active:scale-95 transition-all"
                >
                    Ver Álbum
                </button>
                <button 
                    onClick={onClose}
                    className="py-3 px-4 bg-primary text-black font-bold rounded-xl shadow-glow active:scale-95 transition-all"
                >
                    Continuar
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AlbumRewardModal;
