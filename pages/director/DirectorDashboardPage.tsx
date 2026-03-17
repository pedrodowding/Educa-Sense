
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { schoolService } from '../../services/schoolService';
import { SchoolMember } from '../../types';
import { BulletinBoard } from '../../components/school/BulletinBoard';

const DirectorDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ teachers: 0, students: 0, engagement: 0 });
  const [mySchoolId, setMySchoolId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchool = async () => {
      if (!user) return;
      try {
        const school = await schoolService.getMySchool(user.id, 'director');
        if (school) {
          setMySchoolId(school.schoolId);
          const statsData = await schoolService.getSchoolStats(school.schoolId);
          setStats(statsData);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchool();
  }, [user]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex justify-between items-end">
        <div>
           <h1 className="text-3xl font-black text-gray-900 dark:text-white">Painel do Diretor</h1>
           <p className="text-gray-500">Visão geral da sua escola</p>
        </div>
        <button 
          onClick={() => navigate('/director/import')}
          className="px-4 py-2 bg-primary/10 text-primary rounded-xl font-black text-xs uppercase hover:bg-primary/20 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">upload_file</span>
          Importar Alunos
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          icon="groups" 
          label="Professores" 
          value={stats.teachers} 
          color="bg-blue-500"
          onClick={() => navigate('/director/professores')}
        />
        <StatCard 
          icon="school" 
          label="Alunos Totais" 
          value={stats.students} 
          color="bg-green-500" 
        />
        <StatCard 
          icon="trending_up" 
          label="Taxa de Entrega" 
          value={`${stats.engagement}%`} 
          color="bg-purple-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Main Content Area */}
         <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-surface-dark rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 text-center">
              <h2 className="text-xl font-bold mb-4">Bem-vindo, Diretor!</h2>
              <p className="text-gray-500 mb-6">Selecione uma área acima para gerenciar.</p>
            </div>
         </div>

         {/* Sidebar / Bulletin */}
         <div className="lg:col-span-1">
            {mySchoolId && (
               <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl">
                  <BulletinBoard 
                    schoolId={mySchoolId} 
                    role="director" 
                  />
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`bg-white dark:bg-surface-dark p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-all' : ''}`}
  >
    <div className={`size-14 rounded-2xl ${color} text-white flex items-center justify-center shadow-lg shadow-${color}/30`}>
      <span className="material-symbols-outlined text-3xl">{icon}</span>
    </div>
    <div>
      <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <h3 className="text-3xl font-black text-gray-900 dark:text-white">{value}</h3>
    </div>
  </div>
);

export default DirectorDashboardPage;
