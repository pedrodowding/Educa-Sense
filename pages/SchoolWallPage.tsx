
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BulletinBoard } from '../components/school/BulletinBoard';
import { schoolService } from '../services/schoolService';
import { useNavigate } from 'react-router-dom';

export const SchoolWallPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'director' | 'teacher' | 'guardian' | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    loadSchoolInfo();
  }, [user]);

  const loadSchoolInfo = async () => {
    if (!user) return;

    try {
      setLoading(true);
      let role: 'director' | 'teacher' | 'guardian' | null = null;
      let sId: string | null = null;

      if (user.role === 'teacher') {
        // Verifica se é diretor
        const mySchoolDirector = await schoolService.getMySchool(user.id, 'director');
        if (mySchoolDirector) {
          role = 'director';
          sId = mySchoolDirector.schoolId;
        } else {
            // Verifica se é professor
            const mySchoolTeacher = await schoolService.getMySchool(user.id, 'teacher');
            if (mySchoolTeacher) {
                role = 'teacher';
                sId = mySchoolTeacher.schoolId;
            }
        }
      } else {
        // Guardian
        role = 'guardian';
        // Tenta pegar escola do filho atual
        // Se currentChild não estiver no contexto, precisaria buscar lista de filhos.
        // Vamos assumir que se for guardian, vamos tentar buscar info do primeiro filho ou do selecionado.
        // Por hora, vamos usar um mock ou tentar buscar se tiver childId disponível.
        // Se não tiver childId selecionado, o dashboard deve forçar seleção.
        // Vamos tentar buscar escola do primeiro filho encontrado no banco se não tiver currentChild.
        
        // Simulação: buscar escola do childId se disponível
        // const info = await schoolService.getSchoolInfoForChild(childId);
        // sId = info?.schoolId;
        
        // Se não conseguirmos determinar a escola aqui, o usuário verá a tela de "Nenhuma escola".
      }

      setUserRole(role);
      setSchoolId(sId);
      
    } catch (error) {
      console.error('Error loading school info:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadLogs = async () => {
    if (!schoolId) return;
    try {
        const data = await schoolService.getBulletinLogs(schoolId);
        setLogs(data);
    } catch (error) {
        console.error('Error loading logs:', error);
    }
  };

  useEffect(() => {
      if (showLogs && schoolId) {
          loadLogs();
      }
  }, [showLogs, schoolId]);

  if (loading) return <div className="p-8 text-center animate-pulse">Carregando informações da escola...</div>;

  if (!schoolId && userRole !== 'guardian') {
      return (
          <div className="p-8 text-center max-w-md mx-auto mt-10">
              <h2 className="text-xl font-bold mb-2">Nenhuma escola vinculada</h2>
              <p className="text-text-sub">Você não está vinculado a nenhuma escola como membro da equipe.</p>
              <button onClick={() => navigate('/dashboard')} className="mt-4 px-4 py-2 bg-primary text-black rounded-lg font-bold">Voltar</button>
          </div>
      );
  }

  // Para guardians, se não achou escola, mostra mensagem
  if (!schoolId && userRole === 'guardian') {
       return (
          <div className="p-8 text-center max-w-md mx-auto mt-10">
              <h2 className="text-xl font-bold mb-2">Escola não encontrada</h2>
              <p className="text-text-sub">Não encontramos informações da escola para seus filhos.</p>
               <button onClick={() => navigate('/dashboard')} className="mt-4 px-4 py-2 bg-primary text-black rounded-lg font-bold">Voltar</button>
          </div>
      );
  }

  return (
    <div className="pb-20 md:pb-0">
      <main className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">campaign</span>
                  Mural de Avisos
                </h1>
                <p className="text-text-sub text-sm">Comunicados oficiais e eventos da escola.</p>
            </div>
            {(userRole === 'director' || userRole === 'teacher') && (
                <button 
                    onClick={() => setShowLogs(!showLogs)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${showLogs ? 'bg-primary text-black shadow-glow' : 'bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 hover:bg-gray-50'}`}
                >
                    <span className="material-symbols-outlined text-lg">history</span>
                    {showLogs ? 'Ocultar Logs' : 'Logs de Auditoria'}
                </button>
            )}
        </div>

        {showLogs && (userRole === 'director' || userRole === 'teacher') ? (
            <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 animate-fade-in mb-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                    <span className="material-symbols-outlined text-primary">manage_search</span>
                    Histórico de Alterações (Mural)
                </h3>
                <p className="text-xs text-gray-400 mb-4">Registro técnico de postagens, fixações e exclusões no mural.</p>
                <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                    {logs.map(log => (
                        <div key={log.id} className="text-sm p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex justify-between items-start hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <div className="flex-1">
                                <div className="font-bold flex items-center gap-2 mb-1">
                                    <span className={`w-2 h-2 rounded-full ${
                                      log.action === 'delete' ? 'bg-red-500' : 
                                      log.action === 'create' ? 'bg-green-500' : 
                                      log.action === 'pin' ? 'bg-yellow-500' : 'bg-blue-500'
                                    }`}></span>
                                    <span className="uppercase text-xs tracking-wider">{log.action}</span>
                                </div>
                                <p className="text-xs text-text-sub">
                                    <span className="font-bold text-text-primary">Usuário:</span> {log.userName || log.userId}
                                </p>
                                <div className="text-xs text-text-sub mt-1 bg-white dark:bg-black/20 p-2 rounded-lg font-mono overflow-x-auto">
                                    {JSON.stringify(log.details, null, 2)}
                                </div>
                            </div>
                            <span className="text-[10px] text-text-sub font-mono ml-4 whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleString('pt-BR')}
                            </span>
                        </div>
                    ))}
                    {logs.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <span className="material-symbols-outlined text-3xl mb-2">search_off</span>
                        <p className="text-xs font-bold uppercase">Nenhum registro encontrado</p>
                      </div>
                    )}
                </div>
            </div>
        ) : (
            <BulletinBoard 
                schoolId={schoolId!} 
                role={userRole!} 
                className="animate-fade-in"
            />
        )}
      </main>
    </div>
  );
};
