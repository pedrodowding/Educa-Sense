import React, { useState, useEffect } from 'react';
import { BulletinPost } from '../../types';
import { schoolService } from '../../services/schoolService';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  schoolId: string;
  classId?: string;
  role: 'director' | 'teacher' | 'guardian';
  className?: string;
}

export const BulletinBoard: React.FC<Props> = ({ schoolId, classId, role, className }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form State
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    type: 'notice' as const
  });

  const canWrite = role === 'director' || role === 'teacher';

  useEffect(() => {
    loadPosts();
  }, [schoolId, classId]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await schoolService.getBulletinPosts(schoolId, classId);
      setPosts(data);
    } catch (error) {
      console.error('Error loading bulletin:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await schoolService.createBulletinPost(schoolId, user.id, {
        ...newPost,
        classId
      });
      setIsCreating(false);
      setNewPost({ title: '', content: '', type: 'notice' });
      loadPosts(); // Refresh
    } catch (error) {
      alert('Erro ao criar aviso.');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'event': return 'event';
      case 'homework': return 'menu_book';
      case 'alert': return 'warning';
      default: return 'campaign';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'event': return 'bg-purple-100 text-purple-600';
      case 'homework': return 'bg-blue-100 text-blue-600';
      case 'alert': return 'bg-red-100 text-red-600';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'event': return 'Evento';
      case 'homework': return 'Para Casa';
      case 'alert': return 'Importante';
      default: return 'Aviso';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">feed</span>
          Mural da {classId ? 'Turma' : 'Escola'}
        </h3>
        {canWrite && (
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-bold uppercase hover:bg-gray-200 transition-colors"
          >
            {isCreating ? 'Cancelar' : 'Novo Aviso'}
          </button>
        )}
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-surface-dark p-4 rounded-2xl border-2 border-primary/20 space-y-3 animate-fade-in">
          <input 
            type="text" 
            placeholder="Título do aviso..." 
            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-3 font-bold text-sm"
            value={newPost.title}
            onChange={e => setNewPost({...newPost, title: e.target.value})}
            required
          />
          <textarea 
            placeholder="Escreva a mensagem..." 
            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-3 text-sm h-24 resize-none"
            value={newPost.content}
            onChange={e => setNewPost({...newPost, content: e.target.value})}
            required
          ></textarea>
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {['notice', 'event', 'homework', 'alert'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNewPost({...newPost, type: t as any})}
                  className={`size-8 rounded-full flex items-center justify-center transition-all ${newPost.type === t ? 'bg-primary text-black scale-110 shadow-sm' : 'bg-gray-100 text-gray-400'}`}
                  title={getTypeLabel(t)}
                >
                  <span className="material-symbols-outlined text-sm">{getTypeIcon(t)}</span>
                </button>
              ))}
            </div>
            <button type="submit" className="px-6 py-2 bg-primary text-black font-black rounded-xl text-xs uppercase shadow-glow hover:scale-105 transition-transform">
              Publicar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-xs font-bold uppercase animate-pulse">Carregando mural...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">inbox</span>
            <p className="text-xs text-text-sub font-bold uppercase">Nenhum aviso publicado</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${getTypeColor(post.type)}`}>
                  <span className="material-symbols-outlined text-xs">{getTypeIcon(post.type)}</span>
                  {getTypeLabel(post.type)}
                </div>
                <span className="text-[10px] text-text-sub font-bold">
                  {new Date(post.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <h4 className="font-bold text-base mb-1">{post.title}</h4>
              <p className="text-sm text-text-sub whitespace-pre-wrap">{post.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};