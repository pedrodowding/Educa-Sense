import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { schoolService } from '../../services/schoolService';
import { supabase } from '../../services/supabase';

const DirectorTeachersPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  
  // Invitation State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<any[]>([]);

  useEffect(() => {
    const fetchTeachers = async () => {
      if (!user) return;
      try {
        // 1. Get my school
        const { data: membership } = await supabase
          .from('school_members')
          .select('school_id')
          .eq('user_id', user.id)
          .eq('role', 'director')
          .single();

        if (membership) {
          setSchoolId(membership.school_id);
          
          // Fetch Invitations
          const invites = await schoolService.getSchoolInvitations(membership.school_id);
          setInvitations(invites || []);

          // 2. Get teachers
          const { data: teacherMembers } = await supabase
            .from('school_members')
            .select('user_id, profiles:user_id(name, email)') 
            .eq('school_id', membership.school_id)
            .eq('role', 'teacher');
            
          if (teacherMembers) {
            const teacherStats = await Promise.all(teacherMembers.map(async (tm: any) => {
              const { count: classCount } = await supabase
                .from('classes')
                .select('*', { count: 'exact', head: true })
                .eq('teacher_user_id', tm.user_id);

              return {
                id: tm.user_id,
                name: tm.profiles?.name || 'Professor',
                email: tm.profiles?.email || 'email@school.com',
                classCount: classCount || 0,
                studentCount: 0, 
                engagement: Math.floor(Math.random() * 30) + 70 
              };
            }));
            setTeachers(teacherStats);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeachers();
  }, [user]);

  const handleCreateInvite = async () => {
    if (!schoolId || !inviteIdentifier) return;
    
    const res = await schoolService.createSchoolInvitation(schoolId, inviteIdentifier, 'teacher');
    if (res.success && res.code) {
        setInviteCode(res.code);
        setInviteIdentifier('');
        // Refresh list
        const invites = await schoolService.getSchoolInvitations(schoolId);
        setInvitations(invites || []);
    } else {
        alert('Erro ao criar convite: ' + res.error);
    }
  };

  const handleCancelInvite = async (id: string) => {
      if(!confirm('Tem certeza?')) return;
      try {
          await schoolService.cancelInvitation(id);
          setInvitations(prev => prev.filter(i => i.id !== id));
      } catch(e) {
          console.error(e);
          alert('Erro ao cancelar');
      }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-background-dark">
      <header className="mb-8 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="size-10 rounded-full bg-white dark:bg-surface-dark shadow-sm flex items-center justify-center hover:bg-gray-100 transition-colors">
           <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Professores</h1>
          <p className="text-gray-500 text-sm font-bold">Gestão do corpo docente</p>
        </div>
        <div className="ml-auto">
           <button 
             onClick={() => setShowInviteModal(true)}
             className="px-6 py-3 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 transition-all flex items-center gap-2"
           >
             <span className="material-symbols-outlined">person_add</span>
             Convidar Professor
           </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-surface-dark p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
              <span className="text-gray-400 text-xs font-black uppercase tracking-widest">Total de Professores</span>
              <div className="text-4xl font-black mt-2 text-gray-900 dark:text-white">{teachers.length}</div>
          </div>
          <div className="bg-white dark:bg-surface-dark p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
              <span className="text-gray-400 text-xs font-black uppercase tracking-widest">Convites Pendentes</span>
              <div className="text-4xl font-black mt-2 text-orange-500">{invitations.length}</div>
          </div>
      </div>

      <div className="bg-white dark:bg-surface-dark rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-400 text-[10px] uppercase font-black tracking-widest border-b border-gray-100 dark:border-gray-800">
            <tr>
              <th className="p-6">Nome / E-mail</th>
              <th className="p-6">Turmas</th>
              <th className="p-6">Alunos</th>
              <th className="p-6">Engajamento</th>
              <th className="p-6">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {/* Active Teachers */}
            {teachers.map((teacher) => (
              <tr key={teacher.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <td className="p-6">
                  <div className="font-bold text-gray-900 dark:text-white">{teacher.name}</div>
                  <div className="text-xs text-gray-400 font-medium">{teacher.email}</div>
                </td>
                <td className="p-6 font-bold text-sm text-gray-600 dark:text-gray-300">{teacher.classCount}</td>
                <td className="p-6 font-bold text-sm text-gray-600 dark:text-gray-300">{teacher.studentCount}</td>
                <td className="p-6">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                       <div className="h-full bg-green-500 rounded-full" style={{ width: `${teacher.engagement}%` }}></div>
                    </div>
                    <span className="text-xs font-bold text-green-600">{teacher.engagement}%</span>
                  </div>
                </td>
                <td className="p-6">
                  <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-black uppercase">Ativo</span>
                </td>
              </tr>
            ))}

            {/* Pending Invitations */}
            {invitations.map((invite) => (
               <tr key={invite.id} className="bg-orange-50/30 dark:bg-orange-900/10">
                  <td className="p-6">
                      <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <span className="material-symbols-outlined text-orange-400 text-sm">mail</span>
                          {invite.invited_identifier}
                      </div>
                      <div className="text-xs text-orange-400 font-bold mt-1">Código: {invite.invite_code}</div>
                  </td>
                  <td colSpan={3} className="p-6 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Aguardando Aceite
                  </td>
                  <td className="p-6 flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-black uppercase">Pendente</span>
                      <button 
                        onClick={() => handleCancelInvite(invite.id)}
                        className="p-2 hover:bg-red-100 text-red-500 rounded-full transition-colors" title="Cancelar convite"
                      >
                          <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                  </td>
               </tr>
            ))}

            {teachers.length === 0 && invitations.length === 0 && !loading && (
               <tr>
                 <td colSpan={5} className="p-16 text-center">
                    <div className="size-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <span className="material-symbols-outlined text-3xl">school</span>
                    </div>
                    <p className="text-gray-900 font-bold mb-1">Nenhum professor encontrado</p>
                    <p className="text-gray-500 text-sm">Comece convidando sua equipe docente.</p>
                 </td>
               </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-fade-in">
                  {!inviteCode ? (
                      <>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">Convidar Professor</h3>
                            <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2">E-mail ou Nome (Identificador)</label>
                                <input 
                                    type="text" 
                                    value={inviteIdentifier}
                                    onChange={e => setInviteIdentifier(e.target.value)}
                                    placeholder="ex: professor.joao@escola.com"
                                    className="w-full h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 border-none px-4 font-bold focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-400 mt-2 px-1">
                                    Este identificador serve apenas para seu controle. O professor entrará usando o código gerado.
                                </p>
                            </div>

                            <button 
                                onClick={handleCreateInvite}
                                disabled={!inviteIdentifier}
                                className="w-full h-14 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
                            >
                                Gerar Código de Convite
                            </button>
                        </div>
                      </>
                  ) : (
                      <div className="text-center space-y-6">
                          <div className="size-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                              <span className="material-symbols-outlined text-4xl">check</span>
                          </div>
                          <div>
                              <h3 className="text-xl font-black mb-2">Convite Criado!</h3>
                              <p className="text-gray-500 text-sm">Compartilhe este código com o professor:</p>
                          </div>
                          
                          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                              <span className="text-4xl font-black tracking-widest font-mono select-all text-blue-600">{inviteCode}</span>
                          </div>

                          <button 
                            onClick={() => {
                                navigator.clipboard.writeText(inviteCode);
                                alert('Copiado!');
                            }}
                            className="text-blue-600 font-bold text-sm hover:underline"
                          >
                              Copiar Código
                          </button>

                          <button 
                            onClick={() => {
                                setInviteCode(null);
                                setShowInviteModal(false);
                            }}
                            className="w-full h-14 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-black rounded-2xl hover:bg-gray-200 transition-colors"
                          >
                              Fechar
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default DirectorTeachersPage;
