
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { schoolService } from '../../services/schoolService';
import { SchoolClass, Assignment } from '../../types';
import { RoleManager } from '../../services/roleManager';
import { BulletinBoard } from '../../components/school/BulletinBoard';

const TeacherDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [mySchoolId, setMySchoolId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!user) return;
      try {
        const myAssignments = await schoolService.getMyAssignments(user.id);
        setAssignments(myAssignments);
        
        const schoolData = await schoolService.getMySchool(user.id, 'teacher');
        if (schoolData) setMySchoolId(schoolData.schoolId);

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [user]);

  return (
    <div className="flex flex-col min-h-full pb-20 relative p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">Central do Professor</h1>
        <p className="text-gray-500">Gestão de turmas e tarefas</p>
        <button 
          onClick={() => {
            RoleManager.setRole('guardian');
            navigate('/dashboard');
          }}
          className="mt-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider underline hover:text-primary transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">switch_account</span>
          Trocar para responsável
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <DashboardCard 
          icon="group" 
          label="Minhas Turmas" 
          onClick={() => navigate('/teacher/classes')}
          color="bg-blue-500"
        />
        <DashboardCard 
          icon="assignment" 
          label="Tarefas" 
          onClick={() => navigate('/teacher/assignments')}
          color="bg-purple-500"
        />
      </div>

      {mySchoolId && (
        <section className="mb-8">
          <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl">
             <BulletinBoard 
               schoolId={mySchoolId} 
               role="teacher" 
             />
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-bold mb-4">Tarefas Recentes</h2>
        <div className="space-y-4">
          {assignments.slice(0, 5).map(assign => (
             <div key={assign.id} className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
               <div className="flex justify-between items-start">
                 <div>
                   <h3 className="font-bold">{assign.title}</h3>
                   <p className="text-xs text-gray-500">{assign.competency}</p>
                 </div>
                 <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${assign.required ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                   {assign.required ? 'Obrigatória' : 'Extra'}
                 </span>
               </div>
               <p className="text-xs text-gray-400 mt-2">Prazo: {new Date(assign.dueDate).toLocaleDateString()}</p>
             </div>
          ))}
          {assignments.length === 0 && !loading && (
            <p className="text-gray-400 text-center py-8">Nenhuma tarefa criada.</p>
          )}
        </div>
      </section>
    </div>
  );
};

const DashboardCard = ({ icon, label, onClick, color }: any) => (
  <button 
    onClick={onClick}
    className="bg-white dark:bg-surface-dark p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center gap-3 active:scale-95 transition-all"
  >
    <div className={`size-12 rounded-2xl ${color} text-white flex items-center justify-center shadow-lg shadow-${color}/30`}>
      <span className="material-symbols-outlined text-2xl">{icon}</span>
    </div>
    <span className="font-bold text-gray-900 dark:text-white">{label}</span>
  </button>
);

export default TeacherDashboardPage;
