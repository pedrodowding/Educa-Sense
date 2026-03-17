import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Child, Subject, Guardian } from '../types';
import { RoleManager, AppRole } from '../services/roleManager';
import { PaywallModal } from '../components/PaywallModal';
import { useFriends, useParentPendingFriendRequests } from '../hooks/useFriends';
import { supabase } from '../services/supabase';

interface Props {
  children: Child[];
  onUpdateChild: (id: string, updates: Partial<Child>) => void;
  onAddChild: (child: Child) => void;
  guardian: Guardian | null;
  onRevokeAccess?: (id: string) => Promise<string | null>;
}

const SettingsPage: React.FC<Props> = ({ children, onUpdateChild, onAddChild, guardian, onRevokeAccess }) => {
  const navigate = useNavigate();
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState<Child | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [friendsSaving, setFriendsSaving] = useState(false);
  const [friendsActionLoading, setFriendsActionLoading] = useState<string | null>(null);
  
  const avatarSeeds = [
    'Felix', 'Aneka', 'Willow', 'Bella', 'Trouble', 'Oscar', 
    'Callie', 'Buster', 'Coco', 'Milo', 'Luna', 'Simba'
  ];

  // Initialize selected child from children prop if available
  React.useEffect(() => {
    if (!selectedChildId && children.length > 0) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const selectedChild = children.find(child => child.id === selectedChildId) || null;
  const friendsEnabled = selectedChild ? selectedChild.friendsEnabled !== false : true;
  const friendsParentApprovalRequired = selectedChild?.friendsParentApprovalRequired ?? false;
  const socialInteractionsEnabled = selectedChild ? selectedChild.socialInteractionsEnabled !== false : true;
  const gameEnabled = selectedChild ? selectedChild.gameEnabled !== false : false; // Default false
  const gameTimeLimit = selectedChild?.gameTimeLimit || 5;
  const storyEnabled = selectedChild ? selectedChild.storyEnabled !== false : true;
  const drawingEnabled = selectedChild ? selectedChild.drawingEnabled !== false : true;

  const { friends, loading: loadingFriends, refresh: refreshFriends } = useFriends(selectedChildId || '');
  const { requests: parentPendingRequests, loading: loadingPending, respondRequest: respondParentRequest, refresh: refreshPending } = useParentPendingFriendRequests(selectedChildId || '');
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);

  const fetchBlocks = React.useCallback(async () => {
    if (!selectedChildId) return;
    setLoadingBlocks(true);
    const { data, error } = await supabase.rpc('rpc_get_child_blocks', { p_child_id: selectedChildId });
    if (!error) setBlockedUsers(data || []);
    setLoadingBlocks(false);
  }, [selectedChildId]);

  React.useEffect(() => {
    if (selectedChildId) {
      fetchBlocks();
    }
  }, [selectedChildId, fetchBlocks]);

  const handleRevoke = async (childId: string) => {
    if (confirm('Tem certeza? O código antigo deixará de funcionar imediatamente.') && onRevokeAccess) {
      const newCode = await onRevokeAccess(childId);
      if (newCode) alert(`Novo código gerado: ${newCode}`);
    }
  };

  const handleDebugReset = async (childId: string) => {
    if (!confirm('DEBUG: Isso apagará TODO o progresso de HOJE (checkins, atividades, recompensas). Histórico e XP total serão mantidos. Continuar?')) return;
    
    try {
      // Chamando RPC robusta (v3/final)
      const { data, error } = await supabase.rpc('rpc_reset_day', { p_child_id: childId });
      
      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }
      
      console.log('Reset Result:', data);
      
      if (data && data.success === false) {
         throw new Error(data.error || 'Falha desconhecida no reset');
      }

      alert(`Reset realizado com sucesso!\nItens deletados: ${JSON.stringify(data.deleted_counts, null, 2)}`);
      
      // Forçar recarregamento para limpar cache local
      window.location.reload();
    } catch (err: any) {
      console.error('Debug Reset Critical Error:', err);
      alert('Erro ao resetar: ' + (err.message || JSON.stringify(err)));
    }
  };
  
  const gradeOptions = [
    'Pré-escola',
    '1º Ano',
    '2º Ano',
    '3º Ano',
    '4º Ano',
    '5º Ano',
    '6º Ano',
    '7º Ano',
    '8º Ano',
    '9º Ano'
  ];

  // Suporte Form State
  const [supportSubject, setSupportSubject] = useState('Duvidas');
  const [supportMessage, setSupportMessage] = useState('');
  const [ticketStatus, setTicketStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  const [newChild, setNewChild] = useState<Partial<Child>>({
    name: '',
    age: 7,
    grade: 'Pré-escola',
    difficultySubjects: [],
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
    accessCode: `ACC-${Math.floor(100 + Math.random() * 900)}`
  });

  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'));

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const toggleSubject = (sub: Subject) => {
    if (editingChild) {
      const current = editingChild.difficultySubjects || [];
      const updated = current.includes(sub) 
        ? current.filter(s => s !== sub) 
        : [...current, sub];
      setEditingChild({ ...editingChild, difficultySubjects: updated });
    } else if (isAdding) {
      const current = newChild.difficultySubjects || [];
      const updated = current.includes(sub) 
        ? current.filter(s => s !== sub) 
        : [...current, sub];
      setNewChild({ ...newChild, difficultySubjects: updated });
    }
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTicketStatus('sending');
    setTimeout(() => {
      setTicketStatus('success');
      setSupportMessage('');
      setTimeout(() => setTicketStatus('idle'), 3000);
    }, 1500);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingChild) {
      if (!editingChild.name || !editingChild.age || !editingChild.grade) {
        alert("Por favor, preencha nome, idade e classe.");
        return;
      }
      await onUpdateChild(editingChild.id, editingChild);
      setEditingChild(null);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChild.name || !newChild.age || !newChild.grade) {
      alert("Por favor, preencha nome, idade e classe.");
      return;
    }
    
    try {
      // @ts-ignore
      await onAddChild(newChild as Child);
      setIsAdding(false);
      setNewChild({
        name: '',
        age: 7,
        grade: 'Pré-escola',
        difficultySubjects: [],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
        accessCode: `ACC-${Math.floor(100 + Math.random() * 900)}`
      });
    } catch (error: any) {
      if (error.error === "LIMIT_REACHED" || error.message?.includes("LIMIT_REACHED")) {
         setIsAdding(false);
         setShowPaywall(true);
      } else {
         alert("Erro ao adicionar estudante: " + (error.message || "Tente novamente."));
      }
    }
  };

  const handleSwitchRole = (newRole: AppRole) => {
    RoleManager.setRole(newRole);
    if (newRole === 'teacher') {
      navigate('/teacher');
    } else if (newRole === 'director') {
      navigate('/school');
    } else {
      navigate('/dashboard');
    }
  };

  const canAccessProfessional = guardian?.role === 'admin' || guardian?.role === 'director' || guardian?.role === 'teacher';

  const handleToggleFriendsEnabled = async () => {
    if (!selectedChild) return;
    setFriendsSaving(true);
    const nextEnabled = !friendsEnabled;
    const nextRequireApproval = nextEnabled ? friendsParentApprovalRequired : false;
    await onUpdateChild(selectedChild.id, {
      friendsEnabled: nextEnabled,
      friendsParentApprovalRequired: nextRequireApproval
    });
    setFriendsSaving(false);
    refreshPending();
  };

  const handleToggleRequireApproval = async () => {
    if (!selectedChild || !friendsEnabled) return;
    setFriendsSaving(true);
    const nextRequireApproval = !friendsParentApprovalRequired;
    await onUpdateChild(selectedChild.id, {
      friendsParentApprovalRequired: nextRequireApproval
    });
    setFriendsSaving(false);
    refreshPending();
  };

  const handleToggleSocialInteractions = async () => {
    if (!selectedChild || !friendsEnabled) return;
    setFriendsSaving(true);
    const nextEnabled = !socialInteractionsEnabled;
    await onUpdateChild(selectedChild.id, {
      socialInteractionsEnabled: nextEnabled
    });
    setFriendsSaving(false);
  };

  const handleParentRespond = async (requestId: string, action: 'accept' | 'reject') => {
    setFriendsActionLoading(requestId);
    await respondParentRequest(requestId, action);
    setFriendsActionLoading(null);
    refreshFriends();
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!selectedChild) return;
    setFriendsActionLoading(friendId);
    const { data, error } = await supabase.rpc('rpc_parent_remove_friendship', {
      p_child_id: selectedChild.id,
      p_friend_child_id: friendId
    });
    if (!error && (!data || data.success)) {
      await refreshFriends();
    }
    setFriendsActionLoading(null);
  };

  const handleUnblock = async (blockedId: string) => {
    if (!selectedChild) return;
    setFriendsActionLoading(blockedId);
    const { error } = await supabase.rpc('rpc_unblock_child', {
      p_child_id: selectedChild.id,
      p_blocked_child_id: blockedId
    });
    if (!error) {
      await fetchBlocks();
    }
    setFriendsActionLoading(null);
  };

  const handleToggleGameEnabled = async () => {
    if (!selectedChild) return;
    await onUpdateChild(selectedChild.id, {
      gameEnabled: !gameEnabled
    });
  };

  const handleUpdateGameTime = async (minutes: number) => {
    if (!selectedChild) return;
    await onUpdateChild(selectedChild.id, {
      gameTimeLimit: minutes
    });
  };

  const handleToggleStoryEnabled = async () => {
    if (!selectedChild) return;
    await onUpdateChild(selectedChild.id, {
      storyEnabled: !storyEnabled
    });
  };

  const handleToggleDrawingEnabled = async () => {
    if (!selectedChild) return;
    await onUpdateChild(selectedChild.id, {
      drawingEnabled: !drawingEnabled
    });
  };

  return (
    <div className="flex flex-col min-h-full pb-10 bg-gray-50 dark:bg-background-dark">
      <header className="p-6 pt-10 bg-white dark:bg-surface-dark border-b border-gray-100 dark:border-gray-800 no-print">
        <h1 className="text-3xl font-black text-primary leading-none">Ajustes</h1>
        <p className="text-xs font-bold text-text-sub uppercase tracking-[3px] mt-1">Configurações Gerais</p>
      </header>

      <main className="px-6 py-8 space-y-10 no-print">
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <div>
               <h3 className="text-xl font-black">Estudantes</h3>
               <p className="text-[10px] text-text-sub font-bold uppercase tracking-wide mt-1">Selecione quem você quer acompanhar</p>
            </div>
            <button 
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 rounded-xl bg-primary text-black flex items-center gap-2 shadow-glow active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span className="text-xs font-black uppercase">Adicionar estudante</span>
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {children.map(child => {
              const isSelected = selectedChildId === child.id;
              return (
                <div 
                  key={child.id} 
                  className={`relative bg-white dark:bg-surface-dark p-4 rounded-[32px] border transition-all shadow-sm cursor-pointer ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-gray-100 dark:border-gray-800'}`}
                  onClick={() => setSelectedChildId(child.id)}
                >
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 bg-primary text-black text-[10px] font-black px-2 py-1 rounded-lg shadow-sm z-10 flex items-center gap-1">
                       <span className="material-symbols-outlined text-xs">check</span>
                       Selecionado
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="size-16 rounded-2xl bg-gray-50 dark:bg-gray-800 overflow-hidden border border-gray-100 dark:border-gray-800">
                      <img src={child.avatar} alt={child.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-base leading-none mb-1">{child.name}</p>
                      <p className="text-[10px] text-text-sub font-black uppercase tracking-widest">{child.grade} • <span className="text-primary">{child.xp} XP</span></p>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      {import.meta.env.DEV && (
                        <button 
                          title="Debug: Resetar Dia"
                          onClick={() => handleDebugReset(child.id)}
                          className="h-10 px-3 rounded-xl bg-red-500/10 text-red-500 flex items-center gap-2 active:scale-90 transition-all hover:bg-red-500/20"
                        >
                          <span className="material-symbols-outlined text-sm">restart_alt</span>
                          <span className="text-[10px] font-bold hidden sm:inline">Reset</span>
                        </button>
                      )}
                      <button 
                        title="Sugestões da IA"
                        aria-label="Sugestões da IA"
                        onClick={() => setShowInviteModal(child)}
                        className="h-10 px-3 rounded-xl bg-primary/10 text-primary flex items-center gap-2 active:scale-90 transition-all hover:bg-primary/20"
                      >
                        <span className="material-symbols-outlined text-sm">magic_button</span>
                        <span className="text-[10px] font-bold hidden sm:inline">IA</span>
                      </button>
                      <button 
                        title="Editar Estudante"
                        aria-label="Editar Estudante"
                        onClick={() => setEditingChild(child)}
                        className="h-10 px-3 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center gap-2 active:bg-primary/10 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <span className="material-symbols-outlined text-sm text-text-sub">edit</span>
                        <span className="text-[10px] font-bold text-text-sub hidden sm:inline">Editar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-black px-1">Amigos</h3>
          {!selectedChild && (
            <div className="bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-soft text-center text-sm text-text-sub">
              Selecione um estudante para ajustar amigos.
            </div>
          )}
          {selectedChild && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-surface-dark rounded-[32px] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-soft">
                <button
                  onClick={handleToggleFriendsEnabled}
                  disabled={friendsSaving}
                  className="w-full flex items-center justify-between p-5 border-b border-gray-50 dark:border-gray-800 active:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-text-sub">{friendsEnabled ? 'group' : 'group_off'}</span>
                    <div className="text-left">
                      <p className="font-bold text-sm">Permitir amigos</p>
                      <p className="text-[10px] text-text-sub font-bold uppercase tracking-wider">
                        {friendsEnabled ? 'Ativo' : 'Desativado'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-primary uppercase mr-2">
                      {friendsEnabled ? 'Desligar' : 'Ligar'}
                    </span>
                    <div className={`w-12 h-6 rounded-full relative transition-colors ${friendsEnabled ? 'bg-primary' : 'bg-gray-200'}`}>
                      <div className={`absolute top-1 size-4 bg-white rounded-full transition-all ${friendsEnabled ? 'left-7' : 'left-1'}`}></div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={handleToggleRequireApproval}
                  disabled={!friendsEnabled || friendsSaving}
                  className={`w-full flex items-center justify-between p-5 transition-colors ${!friendsEnabled ? 'opacity-50 cursor-not-allowed' : 'active:bg-gray-50'} border-b border-gray-50 dark:border-gray-800`}
                >
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-text-sub">verified_user</span>
                    <div className="text-left">
                      <p className="font-bold text-sm">Exigir minha aprovação</p>
                      <p className="text-[10px] text-text-sub font-bold uppercase tracking-wider">
                        {friendsEnabled
                          ? (friendsParentApprovalRequired ? 'Obrigatória' : 'Opcional')
                          : 'Indisponível'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-primary uppercase mr-2">
                      {friendsParentApprovalRequired ? 'Desligar' : 'Ligar'}
                    </span>
                    <div className={`w-12 h-6 rounded-full relative transition-colors ${friendsParentApprovalRequired ? 'bg-primary' : 'bg-gray-200'}`}>
                      <div className={`absolute top-1 size-4 bg-white rounded-full transition-all ${friendsParentApprovalRequired ? 'left-7' : 'left-1'}`}></div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={handleToggleSocialInteractions}
                  disabled={!friendsEnabled || friendsSaving}
                  className={`w-full flex items-center justify-between p-5 transition-colors ${!friendsEnabled ? 'opacity-50 cursor-not-allowed' : 'active:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-text-sub">sentiment_satisfied</span>
                    <div className="text-left">
                      <p className="font-bold text-sm">Interações Sociais</p>
                      <p className="text-[10px] text-text-sub font-bold uppercase tracking-wider">
                        {friendsEnabled
                          ? (socialInteractionsEnabled ? 'Reações e Mensagens' : 'Apenas Visualização')
                          : 'Indisponível'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-primary uppercase mr-2">
                      {socialInteractionsEnabled ? 'Desligar' : 'Ligar'}
                    </span>
                    <div className={`w-12 h-6 rounded-full relative transition-colors ${socialInteractionsEnabled ? 'bg-primary' : 'bg-gray-200'}`}>
                      <div className={`absolute top-1 size-4 bg-white rounded-full transition-all ${socialInteractionsEnabled ? 'left-7' : 'left-1'}`}></div>
                    </div>
                  </div>
                </button>
              </div>

              <div className="bg-white dark:bg-surface-dark rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-soft p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm">Convites pendentes</h4>
                  {loadingPending && <span className="text-[10px] font-bold text-text-sub uppercase">Carregando</span>}
                </div>
                {!friendsEnabled && (
                  <div className="text-xs text-text-sub font-bold uppercase tracking-wider">Recurso desativado</div>
                )}
                {friendsEnabled && parentPendingRequests.length === 0 && (
                  <div className="text-sm text-text-sub">Nenhum convite pendente.</div>
                )}
                {friendsEnabled && parentPendingRequests.length > 0 && (
                  <div className="space-y-3">
                    {parentPendingRequests.map(req => (
                      <div key={req.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-sm">
                            {req.from_child?.avatar ? (
                              <img src={req.from_child.avatar} alt={req.from_child?.name} className="w-full h-full object-cover" />
                            ) : (
                              '👤'
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{req.from_child?.name || 'Aluno'}</p>
                            <p className="text-[10px] text-text-sub font-bold uppercase tracking-wider">
                              {new Date(req.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleParentRespond(req.id, 'reject')}
                            disabled={friendsActionLoading === req.id}
                            className="px-3 py-2 rounded-xl bg-gray-100 text-xs font-black uppercase text-text-sub hover:bg-gray-200 transition-colors"
                          >
                            Recusar
                          </button>
                          <button
                            onClick={() => handleParentRespond(req.id, 'accept')}
                            disabled={friendsActionLoading === req.id}
                            className="px-3 py-2 rounded-xl bg-primary text-black text-xs font-black uppercase shadow-glow active:scale-95 transition-all"
                          >
                            Aprovar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-surface-dark rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-soft p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm">Amigos atuais</h4>
                  {loadingFriends && <span className="text-[10px] font-bold text-text-sub uppercase">Carregando</span>}
                </div>
                {friends.length === 0 && (
                  <div className="text-sm text-text-sub">Nenhum amigo ainda.</div>
                )}
                {friends.length > 0 && (
                  <div className="space-y-3">
                    {friends.map(friend => (
                      <div key={friend.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-sm">
                            {friend.friend_avatar ? (
                              <img src={friend.friend_avatar} alt={friend.friend_name} className="w-full h-full object-cover" />
                            ) : (
                              '👤'
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{friend.friend_name}</p>
                            <p className="text-[10px] text-text-sub font-bold uppercase tracking-wider">{friend.friend_xp} XP</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFriend(friend.friend_id)}
                          disabled={friendsActionLoading === friend.friend_id}
                          className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-black uppercase hover:bg-red-100 transition-colors"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-surface-dark rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-soft p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm">Segurança Social (Bloqueios)</h4>
                  {loadingBlocks && <span className="text-[10px] font-bold text-text-sub uppercase">Carregando</span>}
                </div>
                {blockedUsers.length === 0 && (
                  <div className="text-sm text-text-sub">Nenhum usuário bloqueado.</div>
                )}
                {blockedUsers.length > 0 && (
                  <div className="space-y-3">
                    {blockedUsers.map(block => (
                      <div key={block.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-red-50 text-red-500 overflow-hidden flex items-center justify-center text-sm">
                            <span className="material-symbols-outlined">block</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold">{block.blocked_child?.name || 'Usuário'}</p>
                            <p className="text-[10px] text-text-sub font-bold uppercase tracking-wider">Bloqueado em {new Date(block.created_at).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnblock(block.blocked_child.id)}
                          disabled={friendsActionLoading === block.blocked_child.id}
                          className="px-3 py-2 rounded-xl bg-gray-100 text-xs font-black uppercase text-text-sub hover:bg-gray-200 transition-colors"
                        >
                          Desbloquear
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Sprint 8B: Recompensas & Jogos */}
        <section className="space-y-4">
          <h3 className="text-xl font-black px-1">Recompensas & Jogos</h3>
          {!selectedChild && (
            <div className="bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-soft text-center text-sm text-text-sub">
              Selecione um estudante para ajustar recompensas.
            </div>
          )}
          {selectedChild && (
            <div className="bg-white dark:bg-surface-dark rounded-[32px] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-soft">
               {/* Toggle Livro de Histórias */}
               <button
                  onClick={handleToggleStoryEnabled}
                  className="w-full flex items-center justify-between p-5 border-b border-gray-50 dark:border-gray-800 active:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-text-sub">{storyEnabled ? 'auto_stories' : 'menu_book_off'}</span>
                    <div className="text-left">
                      <p className="font-bold text-sm">Livro de Histórias</p>
                      <p className="text-[10px] text-text-sub font-bold uppercase tracking-wider">
                        {storyEnabled ? 'Ativo' : 'Desativado'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-primary uppercase mr-2">
                      {storyEnabled ? 'Desligar' : 'Ligar'}
                    </span>
                    <div className={`w-12 h-6 rounded-full relative transition-colors ${storyEnabled ? 'bg-primary' : 'bg-gray-200'}`}>
                      <div className={`absolute top-1 size-4 bg-white rounded-full transition-all ${storyEnabled ? 'left-7' : 'left-1'}`}></div>
                    </div>
                  </div>
                </button>

               {/* Toggle Artes Criativas */}
               <button
                  onClick={handleToggleDrawingEnabled}
                  className="w-full flex items-center justify-between p-5 border-b border-gray-50 dark:border-gray-800 active:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-text-sub">{drawingEnabled ? 'palette' : 'palette_off'}</span>
                    <div className="text-left">
                      <p className="font-bold text-sm">Artes Criativas</p>
                      <p className="text-[10px] text-text-sub font-bold uppercase tracking-wider">
                        {drawingEnabled ? 'Ativo' : 'Desativado'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-primary uppercase mr-2">
                      {drawingEnabled ? 'Desligar' : 'Ligar'}
                    </span>
                    <div className={`w-12 h-6 rounded-full relative transition-colors ${drawingEnabled ? 'bg-primary' : 'bg-gray-200'}`}>
                      <div className={`absolute top-1 size-4 bg-white rounded-full transition-all ${drawingEnabled ? 'left-7' : 'left-1'}`}></div>
                    </div>
                  </div>
                </button>

               {/* Toggle Hora do Jogo */}
               <button
                  onClick={handleToggleGameEnabled}
                  className="w-full flex items-center justify-between p-5 border-b border-gray-50 dark:border-gray-800 active:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-text-sub">{gameEnabled ? 'videogame_asset' : 'videogame_asset_off'}</span>
                    <div className="text-left">
                      <p className="font-bold text-sm">Hora do Jogo</p>
                      <p className="text-[10px] text-text-sub font-bold uppercase tracking-wider">
                        {gameEnabled ? 'Ativo' : 'Desativado'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-primary uppercase mr-2">
                      {gameEnabled ? 'Desligar' : 'Ligar'}
                    </span>
                    <div className={`w-12 h-6 rounded-full relative transition-colors ${gameEnabled ? 'bg-primary' : 'bg-gray-200'}`}>
                      <div className={`absolute top-1 size-4 bg-white rounded-full transition-all ${gameEnabled ? 'left-7' : 'left-1'}`}></div>
                    </div>
                  </div>
                </button>

                {/* Seletor de Tempo */}
                <div className={`p-5 transition-all ${!gameEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                   <div className="flex items-center gap-4 mb-3">
                      <span className="material-symbols-outlined text-text-sub">timer</span>
                      <div>
                         <p className="font-bold text-sm">Tempo Limite</p>
                         <p className="text-[10px] text-text-sub font-bold uppercase tracking-wider">Duração máxima por dia</p>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      {[5, 10, 15, 20].map(min => (
                         <button
                           key={min}
                           onClick={() => handleUpdateGameTime(min)}
                           disabled={!gameEnabled}
                           className={`flex-1 py-2 rounded-xl font-bold text-xs border-2 transition-all ${gameTimeLimit === min ? 'border-primary bg-primary/10 text-primary' : 'border-gray-100 bg-gray-50 text-gray-500'}`}
                         >
                           {min} min
                         </button>
                      ))}
                   </div>
                </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
           <h3 className="text-xl font-black px-1">Escola</h3>
           <button 
             onClick={() => navigate('/school/wall')}
             className="w-full bg-white dark:bg-surface-dark p-5 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-soft flex items-center justify-between active:scale-[0.98] transition-all group"
           >
              <div className="flex items-center gap-4">
                 <div className="size-12 rounded-2xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                    <span className="material-symbols-outlined">campaign</span>
                 </div>
                 <div className="text-left">
                    <h4 className="font-bold text-lg">Comunicados da Escola</h4>
                    <p className="text-xs text-text-sub font-medium">Veja avisos e novidades importantes</p>
                 </div>
              </div>
              <div className="size-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-colors">
                 <span className="material-symbols-outlined">arrow_forward</span>
              </div>
           </button>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-black px-1">Interface</h3>
          <div className="bg-white dark:bg-surface-dark rounded-[32px] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-soft">
            <button onClick={toggleDarkMode} className="w-full flex items-center justify-between p-5 border-b border-gray-50 dark:border-gray-800 active:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-text-sub">{darkMode ? 'dark_mode' : 'light_mode'}</span>
                <div className="text-left">
                   <p className="font-bold text-sm">Modo Escuro</p>
                   <p className="text-[10px] text-text-sub font-bold uppercase tracking-wider">Tema: {darkMode ? 'Escuro' : 'Claro'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <span className="text-[10px] font-bold text-primary uppercase mr-2">
                    {darkMode ? 'Mudar para Claro' : 'Mudar para Escuro'}
                 </span>
                 <div className={`w-12 h-6 rounded-full relative transition-colors ${darkMode ? 'bg-primary' : 'bg-gray-200'}`}>
                   <div className={`absolute top-1 size-4 bg-white rounded-full transition-all ${darkMode ? 'left-7' : 'left-1'}`}></div>
                 </div>
              </div>
            </button>
          </div>
        </section>

        {canAccessProfessional && (
        <section className="space-y-4">
           <h3 className="text-xl font-black px-1">Acesso Profissional</h3>
           <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-surface-dark p-5 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-soft flex flex-col justify-between h-32 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="material-symbols-outlined text-6xl text-primary">school</span>
                 </div>
                 <div>
                    <p className="font-bold text-sm">Acesso Docente</p>
                    <p className="text-[10px] text-text-sub font-bold uppercase tracking-wider mt-1">Gestão de turmas</p>
                 </div>
                 {guardian?.role === 'teacher' ? (
                   <button 
                     onClick={() => handleSwitchRole('guardian')}
                     className="w-full py-2 bg-red-50 text-red-500 rounded-xl font-black text-xs uppercase tracking-wide hover:bg-red-100 transition-colors z-10"
                   >
                     Sair do Modo
                   </button>
                 ) : (
                   <button 
                     onClick={() => handleSwitchRole('teacher')}
                     className="w-full py-2 bg-primary/10 text-primary rounded-xl font-black text-xs uppercase tracking-wide hover:bg-primary/20 transition-colors z-10"
                   >
                     Acessar
                   </button>
                 )}
              </div>

              <div className="bg-white dark:bg-surface-dark p-5 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-soft flex flex-col justify-between h-32 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="material-symbols-outlined text-6xl text-purple-500">domain</span>
                 </div>
                 <div>
                    <p className="font-bold text-sm">Sou Diretor</p>
                    <p className="text-[10px] text-text-sub font-bold uppercase tracking-wider mt-1">Gestão escolar</p>
                 </div>
                 {guardian?.role === 'director' ? (
                   <button 
                     onClick={() => handleSwitchRole('guardian')}
                     className="w-full py-2 bg-red-50 text-red-500 rounded-xl font-black text-xs uppercase tracking-wide hover:bg-red-100 transition-colors z-10"
                   >
                     Sair do Modo
                   </button>
                 ) : (
                   <button 
                     onClick={() => handleSwitchRole('director')}
                     className="w-full py-2 bg-purple-50 text-purple-500 rounded-xl font-black text-xs uppercase tracking-wide hover:bg-purple-100 transition-colors z-10"
                   >
                     Acessar
                   </button>
                 )}
              </div>
           </div>
        </section>
        )}

        <section className="space-y-4">
           <h3 className="text-xl font-black px-1">Suporte</h3>
           <div className="bg-white dark:bg-surface-dark rounded-[40px] p-6 border border-gray-100 dark:border-gray-800 shadow-soft space-y-6">
              <div className="flex items-center gap-4">
                 <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">help_center</span>
                 </div>
                 <div>
                    <h4 className="font-bold">Central de Ajuda</h4>
                    <p className="text-xs text-text-sub">Precisa de suporte ou quer sugerir algo?</p>
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                 <button 
                   onClick={() => setShowSupportModal(true)}
                   className="py-3 px-4 rounded-2xl bg-gray-50 dark:bg-gray-800 font-bold text-xs hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
                 >
                   Fale Conosco
                 </button>
                 <a 
                   href="mailto:suporte@educasense.com"
                   className="py-3 px-4 rounded-2xl bg-gray-50 dark:bg-gray-800 font-bold text-xs flex items-center justify-center hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
                 >
                   Email Direto
                 </a>
              </div>
           </div>
        </section>
      </main>

      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-[40px] p-8 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-black">Fale Conosco</h2>
               <button onClick={() => setShowSupportModal(false)} className="size-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            {ticketStatus === 'success' ? (
              <div className="py-10 text-center space-y-4 animate-fade-in">
                 <div className="size-20 bg-primary/20 rounded-full flex items-center justify-center text-primary mx-auto">
                    <span className="material-symbols-outlined text-4xl">check_circle</span>
                 </div>
                 <h3 className="text-xl font-black">Ticket Criado!</h3>
                 <p className="text-sm text-text-sub">Protocolo: #ES-{Math.floor(1000 + Math.random() * 9000)}<br/>Responderemos em até 24 horas.</p>
              </div>
            ) : (
              <form onSubmit={handleSupportSubmit} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Seu E-mail</label>
                    <input 
                      type="text" 
                      disabled 
                      value={guardian?.email || 'usuario@email.com'} 
                      className="w-full bg-gray-100 dark:bg-gray-900 border-none rounded-2xl h-14 px-4 font-bold opacity-60" 
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Assunto</label>
                    <select 
                      value={supportSubject}
                      onChange={(e) => setSupportSubject(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl h-14 px-4 font-bold"
                    >
                       <option value="Duvidas">Dúvidas</option>
                       <option value="Reclamação">Reclamação</option>
                       <option value="Ajuda">Ajuda Técnica</option>
                    </select>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Sua Mensagem</label>
                    <textarea 
                      required
                      placeholder="Como podemos te ajudar?"
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-3xl p-4 font-bold h-32 resize-none"
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                    ></textarea>
                 </div>

                 <button 
                  type="submit" 
                  disabled={ticketStatus === 'sending'}
                  className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3"
                 >
                    {ticketStatus === 'sending' ? 'Enviando...' : 'Abrir Chamado'}
                    <span className="material-symbols-outlined">send</span>
                 </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Adicionar/Editar Estudante */}
      {(editingChild || isAdding) && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 no-print">
          <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-[40px] p-8 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-black">{isAdding ? 'Novo Estudante' : 'Editar Estudante'}</h2>
               <button onClick={() => { setEditingChild(null); setIsAdding(false); }} className="size-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={isAdding ? handleAdd : handleUpdate} className="space-y-6">
               <div className="space-y-3">
                 <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Avatar</label>
                 
                 {/* Access Code Display */}
                 {!isAdding && editingChild && (
                   <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-4 flex items-center justify-between">
                     <div>
                       <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Código de Acesso</p>
                       <p className="text-2xl font-black tracking-widest text-black dark:text-white font-mono">{editingChild.accessCode || '---'}</p>
                     </div>
                     {onRevokeAccess && (
                       <button 
                         type="button"
                         onClick={() => handleRevoke(editingChild.id)}
                         className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 active:scale-95 transition-all"
                         title="Gerar novo código"
                       >
                         <span className="material-symbols-outlined">refresh</span>
                       </button>
                     )}
                   </div>
                 )}

                 <div className="flex justify-center">
                   <div 
                     className="relative size-24 rounded-full border-4 border-primary p-1 cursor-pointer hover:opacity-80 transition-opacity"
                     onClick={() => setShowAvatarSelector(true)}
                   >
                     <img 
                       src={isAdding ? newChild.avatar : editingChild?.avatar} 
                       alt="Avatar" 
                       className="w-full h-full rounded-full object-cover bg-gray-100"
                       onError={(e) => {
                          // Se falhar o carregamento do avatar (ex: versão antiga da API), tenta carregar com a nova versão se for dicebear, ou fallback genérico
                          const currentSrc = e.currentTarget.src;
                          if (currentSrc.includes('dicebear.com/7.x')) {
                              e.currentTarget.src = currentSrc.replace('7.x', '9.x');
                          } else {
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${isAdding ? newChild.name : editingChild?.name}&background=random`;
                          }
                       }} 
                     />
                     <div className="absolute bottom-0 right-0 bg-black text-white rounded-full p-1 border-2 border-white">
                        <span className="material-symbols-outlined text-sm">edit</span>
                     </div>
                   </div>
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Dados Básicos</label>
                 <input 
                    type="text" 
                    placeholder="Nome do aluno" 
                    required 
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl h-14 px-4 font-bold focus:ring-2 focus:ring-primary" 
                    value={isAdding ? newChild.name : editingChild?.name} 
                    onChange={(e) => isAdding ? setNewChild({...newChild, name: e.target.value}) : setEditingChild({...editingChild!, name: e.target.value})} 
                 />
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-text-sub px-1">Idade</label>
                      <input 
                        type="number" 
                        placeholder="Ex: 7" 
                        required
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl h-14 px-4 font-bold focus:ring-2 focus:ring-primary" 
                        value={isAdding ? newChild.age : editingChild?.age} 
                        onChange={(e) => isAdding ? setNewChild({...newChild, age: parseInt(e.target.value)}) : setEditingChild({...editingChild!, age: parseInt(e.target.value)})} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-text-sub px-1">Classe</label>
                      <select 
                        required
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl h-14 px-4 font-bold focus:ring-2 focus:ring-primary" 
                        value={isAdding ? newChild.grade : editingChild?.grade} 
                        onChange={(e) => isAdding ? setNewChild({...newChild, grade: e.target.value}) : setEditingChild({...editingChild!, grade: e.target.value})}
                      >
                        {gradeOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                 </div>
               </div>

               <div className="space-y-3">
                 <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Matérias com maior dificuldade</label>
                 <div className="grid grid-cols-2 gap-2">
                    {Object.values(Subject).map(sub => {
                      const selected = isAdding 
                        ? newChild.difficultySubjects?.includes(sub) 
                        : editingChild?.difficultySubjects?.includes(sub);
                      return (
                        <button 
                          key={sub}
                          type="button"
                          onClick={() => toggleSubject(sub)}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${selected ? 'border-primary bg-primary/10 text-primary' : 'border-gray-50 dark:border-gray-800'}`}
                        >
                          <span className="material-symbols-outlined text-sm">{selected ? 'check_circle' : 'circle'}</span>
                          <span className="text-xs font-bold">{sub}</span>
                        </button>
                      );
                    })}
                 </div>
               </div>

               <button type="submit" className="w-full h-16 bg-primary text-black font-black rounded-2xl shadow-glow active:scale-95 transition-all">
                 {isAdding ? 'Adicionar Aluno' : 'Salvar Alterações'}
               </button>
               
               {!isAdding && editingChild && onRevokeAccess && (
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                    <p className="text-[10px] text-center text-text-sub font-bold uppercase tracking-widest">Acesso do Estudante</p>
                    <button 
                      type="button"
                      onClick={() => handleRevoke(editingChild.id)}
                      className="w-full h-12 border-2 border-red-500/20 text-red-500 font-bold rounded-2xl hover:bg-red-500/5 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">lock_reset</span>
                      Revogar Acesso (Regerar Código)
                    </button>
                  </div>
               )}
            </form>
          </div>
        </div>
      )}

      {/* Paywall Modal */}
      <PaywallModal 
        isOpen={showPaywall} 
        onClose={() => setShowPaywall(false)} 
        featureName="Limite de Estudantes"
      />

      {/* Modal Seleção de Avatar */}
      {showAvatarSelector && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4">
           <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-[40px] p-8 shadow-2xl animate-fade-in-up">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-black">Escolher Avatar</h2>
                 <button onClick={() => setShowAvatarSelector(false)} className="size-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                   <span className="material-symbols-outlined">close</span>
                 </button>
              </div>
              <div className="grid grid-cols-4 gap-4 max-h-[50vh] overflow-y-auto p-2">
                 {avatarSeeds.map(seed => {
                   const url = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
                   return (
                     <button 
                       key={seed}
                       type="button"
                       onClick={() => {
                         if (isAdding) setNewChild({...newChild, avatar: url});
                         else if (editingChild) setEditingChild({...editingChild, avatar: url});
                         setShowAvatarSelector(false);
                       }}
                       className="aspect-square rounded-2xl overflow-hidden border-2 border-transparent hover:border-primary hover:scale-105 transition-all bg-gray-100"
                     >
                        <img 
                          src={url} 
                          alt={seed} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${seed}&background=random`;
                          }}
                        />
                     </button>
                   );
                 })}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
