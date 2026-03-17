
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Badge, Child, Exercise } from '../types';
import { supabase, setChildAccessCodeHeader } from '../services/supabase';
import { buildDeviceInfo, getOrCreateDeviceId } from '../services/device';
import { fetchChildBadges } from '../services/gamificationService';
import { fetchChildAlbum, ChildAlbumItem } from '../services/albumService';
import { useStudent } from '../contexts/StudentContext';
import { getStudentSession, clearStudentSession } from '../services/studentSession';
import { useFamilyChildren } from '../contexts/FamilyChildrenContext';

// Components
import { StudentHeader } from './student/components/StudentHeader';
import { TodayPlanCard } from './student/components/TodayPlanCard';
import { WeeklyGoalsCard } from './student/components/WeeklyGoalsCard';
import { FriendsCard } from './student/components/FriendsCard';
import { StoryBookCard } from './student/components/StoryBookCard';
import { GameHubCard } from './student/components/GameHubCard';
import { TodayActivityFeed } from './student/components/TodayActivityFeed';
import { BadgesSection } from './student/components/BadgesSection';
import { NextMissionsList } from './student/components/NextMissionsList';

interface Props {
  children: Child[];
  history: Exercise[];
  onUpdateChild: (id: string, updates: Partial<Child>) => void;
}

const StudentDashboardPage: React.FC<Props> = ({ children, history, onUpdateChild }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryChildId = useMemo(() => new URLSearchParams(location.search).get('child'), [location.search]);
  const { familyChildren } = useFamilyChildren();
  const resolvedChildren = familyChildren.length > 0 ? familyChildren : children;
  const [selectedChild, setSelectedChild] = useState<Child | null>(() => {
    const stateChild = (location.state as any)?.child as Child | undefined;
    if (stateChild) return stateChild;
    if (!queryChildId) {
        // Tenta ler do localStorage (sessão de código)
        const session = getStudentSession();
        if (session && session.childId) {
            // Retorna um objeto parcial temporário até carregar via contexto/RPC
            // O useEffect abaixo vai lidar com o carregamento real se necessário
            return { id: session.childId } as Child;
        }
        return null;
    }
    return resolvedChildren.find(c => c.id === queryChildId) || null;
  });
  
  // Integração com StudentContext (para login via código)
  const { student: contextStudent, loading: studentLoading } = useStudent();

  useEffect(() => {
      // Se tivermos um aluno vindo do contexto (login por código), usa ele
      if (contextStudent && !queryChildId) {
          setSelectedChild(contextStudent);
      }
  }, [contextStudent, queryChildId]);

  const [badges, setBadges] = useState<Badge[]>([]);
  const [albumItems, setAlbumItems] = useState<ChildAlbumItem[]>([]);

  useEffect(() => {
    if (!queryChildId) return;
    if (selectedChild) return;
    const found = resolvedChildren.find(c => c.id === queryChildId) || null;
    if (found) setSelectedChild(found);
  }, [resolvedChildren, queryChildId, selectedChild]);

  // Carregar badges e album do aluno
  useEffect(() => {
    if (!selectedChild) return;
    fetchChildBadges(selectedChild.id).then(setBadges);
    fetchChildAlbum(selectedChild.id).then(setAlbumItems);
  }, [selectedChild?.id]);

  useEffect(() => {
    if (!selectedChild) return;
    const accessCode = sessionStorage.getItem('educasense_access_code');
    
    // Set header for RLS (Sprint 8.1)
    if (accessCode) {
      setChildAccessCodeHeader(accessCode);
    }

    if (!accessCode) return;

    const deviceId = getOrCreateDeviceId();

    let cancelled = false;
    const touch = async () => {
      if (cancelled) return;
      try {
        await supabase.rpc('register_child_device', {
          p_access_code: accessCode,
          p_device_id: deviceId,
          p_info: buildDeviceInfo()
        });
      } catch {
        return;
      }
    };

    touch();
    const interval = window.setInterval(touch, 60_000 * 5);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [selectedChild]);

  if (resolvedChildren.length === 0 && !selectedChild) {
    return (
      <div className="flex flex-col min-h-screen bg-primary/5 p-8 items-center justify-center text-center">
        <h1 className="text-3xl font-black mb-4">Modo Aluno</h1>
        <p className="text-sm font-bold text-text-sub mb-10">Digite o código que seus responsáveis passaram.</p>
        <button
          onClick={() => navigate('/login')}
          className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3 max-w-sm"
        >
          Entrar com Código
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    );
  }

  if (!selectedChild) {
    return (
      <div className="flex flex-col min-h-screen bg-primary/5 p-8 items-center justify-center text-center">
        <h1 className="text-3xl font-black mb-10">Quem vai estudar <br/><span className="text-primary italic">brincando</span> hoje?</h1>
        <div className="grid grid-cols-2 gap-6 w-full max-w-sm">
          {resolvedChildren.map(child => (
            <button 
              key={child.id}
              onClick={() => setSelectedChild(child)}
              className="flex flex-col items-center gap-4 group active:scale-95 transition-all"
            >
              <div className="size-32 rounded-[48px] bg-white border-4 border-white shadow-xl group-hover:border-primary overflow-hidden transition-all">
                <img src={child.avatar} alt={child.name} className="w-full h-full object-cover" />
              </div>
              <span className="text-lg font-black">{child.name}</span>
            </button>
          ))}
        </div>
        <button 
          onClick={() => navigate('/dashboard')}
          className="mt-20 text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">settings</span> Voltar ao modo Pais
        </button>
      </div>
    );
  }

  const childExercises = history.filter(ex => ex.childId === selectedChild.id);

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-background-dark pb-10">
      
      <StudentHeader 
        child={selectedChild} 
        onLogout={() => {
            const hadStudentSession = !!getStudentSession()?.childId;
            clearStudentSession();
            setChildAccessCodeHeader(null); // Clear header
            
            // Se for login por código, volta pro login
            if (!queryChildId && (hadStudentSession || resolvedChildren.length === 0)) {
              navigate('/login');
              return;
            }
            setSelectedChild(null);
        }}
      />

      <main>
        {/* 1. Missão de Hoje (CTA Principal e Narrativa) */}
        <TodayPlanCard child={selectedChild} />

        {/* 2. Livro de Histórias (Sprint 8A) */}
        <div className="px-6 mb-2">
           <StoryBookCard child={selectedChild} />
           <GameHubCard child={selectedChild} />
        </div>

        {/* 3. Amigos (Microfeedback) */}
        <div className="px-6 mb-8">
           <FriendsCard child={selectedChild} />
        </div>

        {/* 3. Medalhas (Proximidade) */}
        <BadgesSection badges={badges} />

        {/* 4. Histórico Recente e Próximos Passos */}
        <TodayActivityFeed childId={selectedChild.id} />
        <NextMissionsList exercises={childExercises} />

        {/* 5. Metas da Semana (Secundário) */}
        <WeeklyGoalsCard childId={selectedChild.id} />
      </main>

    </div>
  );
};

export default StudentDashboardPage;
