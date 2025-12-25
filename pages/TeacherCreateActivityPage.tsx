
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Guardian, Subject, Difficulty, Objective, Exercise } from '../types';
import { generateExerciseAI } from '../services/geminiService';

interface Props {
  teacher: Guardian | null;
  onSave: (exercise: Exercise) => void;
}

const TeacherCreateActivityPage: React.FC<Props> = ({ teacher, onSave }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState<Subject>(Subject.PORTUGUESE);
  const [grade, setGrade] = useState('3º Ano');
  const [theme, setTheme] = useState('');
  
  const handleGenerate = async () => {
    if (!theme) return alert('Por favor, defina um tema para a atividade.');
    setLoading(true);
    
    try {
      // Usamos a lógica de IA existente adaptada para professor
      const exercise = await generateExerciseAI({
        childName: "Turma " + grade,
        age: 8,
        grade,
        subject,
        difficulty: Difficulty.MEDIUM,
        objective: Objective.REINFORCE,
        questionCount: 5
      });
      
      const teacherExercise: Exercise = {
        ...exercise,
        createdBy: 'teacher',
        teacherName: teacher?.name,
        title: `[Prof. ${teacher?.name.split(' ')[1]}] ${theme}`
      };
      
      onSave(teacherExercise);
      alert('Atividade pedagógica gerada e disponibilizada para os responsáveis!');
      navigate('/teacher');
    } catch (e) {
      alert('Erro ao processar atividade.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-background-dark text-white">
      <div className="size-24 rounded-full border-4 border-primary border-t-transparent animate-spin mb-8"></div>
      <h2 className="text-2xl font-black text-primary">IA Pedagógica em Ação...</h2>
      <p className="mt-4 text-gray-400 italic">Estruturando questões baseadas no tema: {theme}</p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-background-dark">
      <header className="p-6 pt-10 flex items-center justify-between border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="size-10 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="material-symbols-outlined">close</span>
        </button>
        <h1 className="text-xl font-black">Planejamento IA</h1>
        <div className="size-10"></div>
      </header>

      <main className="p-6 space-y-8 pb-32">
        <section className="space-y-4">
           <div className="bg-primary/5 p-4 rounded-3xl border border-primary/20 flex gap-4">
              <span className="material-symbols-outlined text-primary">info</span>
              <p className="text-xs text-primary font-bold leading-relaxed">
                As atividades geradas serão notificadas no mural dos responsáveis e estarão disponíveis para os alunos no modo "Aventura".
              </p>
           </div>
        </section>

        <section className="space-y-6">
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Série/Turma Alvo</label>
              <select 
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full h-14 bg-gray-50 border-none rounded-2xl px-4 font-bold"
              >
                 <option value="Pré-escola">Pré-escola</option>
                 <option value="1º Ano">1º Ano</option>
                 <option value="2º Ano">2º Ano</option>
                 <option value="3º Ano">3º Ano</option>
              </select>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Matéria</label>
              <div className="grid grid-cols-2 gap-3">
                 {Object.values(Subject).slice(0, 4).map(sub => (
                   <button 
                    key={sub}
                    onClick={() => setSubject(sub)}
                    className={`h-14 rounded-2xl border-2 font-bold text-xs transition-all ${subject === sub ? 'border-primary bg-primary/10 text-primary' : 'border-gray-50'}`}
                   >
                     {sub}
                   </button>
                 ))}
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Tema da Atividade</label>
              <input 
                type="text" 
                placeholder="Ex: Ciclo da Água, Adição com reservas..."
                className="w-full h-14 bg-gray-50 border-none rounded-2xl px-4 font-bold"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              />
           </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white to-transparent">
         <button 
           onClick={handleGenerate}
           className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3"
         >
            <span className="material-symbols-outlined">auto_awesome</span>
            Gerar e Disponibilizar
         </button>
      </div>
    </div>
  );
};

export default TeacherCreateActivityPage;
