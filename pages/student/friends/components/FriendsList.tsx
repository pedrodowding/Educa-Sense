import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Friendship, Child } from '../../../../types';

interface Props {
  friends: Friendship[];
  loading: boolean;
  myChild: Child;
}

export const FriendsList: React.FC<Props> = ({ friends, loading, myChild }) => {
  const navigate = useNavigate();

  if (loading && friends.length === 0) {
    return (
      <div className="p-8 text-center text-text-sub animate-pulse">
        Carregando amigos...
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl shadow-sm border-2 border-dashed border-gray-200">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-3xl">
          👋
        </div>
        <h3 className="font-bold text-lg text-text-main mb-2">Vamos fazer amigos?</h3>
        <p className="text-sm text-text-sub">
          Peça o código secreto do seu amigo para brincarem juntos!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {friends.map((friend) => (
        <button 
          key={friend.id}
          onClick={() => navigate(`/student/friends/${friend.friend_id}`, { state: { child: myChild } })}
          className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 text-left active:scale-95 transition-all hover:bg-gray-50 group w-full"
        >
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-2xl overflow-hidden group-hover:shadow-md transition-all shrink-0">
             {friend.friend_avatar ? (
                <img src={friend.friend_avatar} alt={friend.friend_name} className="w-full h-full object-cover" />
             ) : (
                '👤'
             )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-text-main truncate">{friend.friend_name}</h4>
            <div className="flex items-center gap-1 text-xs text-text-sub font-medium">
              <span className="text-yellow-500 material-symbols-outlined text-sm filled">star</span>
              {friend.friend_xp} XP
            </div>
          </div>
          <span className="material-symbols-outlined text-gray-300 group-hover:text-primary transition-colors">chevron_right</span>
        </button>
      ))}
    </div>
  );
};
