
import React from 'react';
import { useNavigate } from 'react-router-dom';

const ProgramPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 flex items-center justify-between bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 pb-2 transition-colors duration-200">
        <button onClick={() => navigate('/')} className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-text-main dark:text-white transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold flex-1 text-center">Exercício Fácil</h2>
        <button 
          onClick={() => navigate('/exercicio-facil/historico')}
          className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-text-main dark:text-white transition-colors"
        >
          <span className="material-symbols-outlined">history</span>
        </button>
      </header>

      <main className="flex-1 px-4 py-3 flex flex-col gap-6">
        <div className="w-full overflow-hidden rounded-[32px] bg-gray-200 dark:bg-gray-800 aspect-[3/2] relative shadow-lg">
          <img 
            src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop" 
            alt="Criatividade e Estudo"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
          <div className="absolute bottom-6 left-6 right-6">
             <span className="bg-primary text-background-dark text-[10px] font-black px-3 py-1 rounded-full uppercase mb-2 inline-block">Motor Educacional</span>
             <h3 className="text-white text-xl font-bold">Aprendizado Personalizado</h3>
          </div>
        </div>

        <div className="text-center px-2">
          <h1 className="text-[28px] font-black leading-tight mb-3">
            O reforço escolar que seu filho precisa.
          </h1>
          <p className="text-text-sub dark:text-gray-400 text-base">
            Gere atividades de Português, Matemática e muito mais, adaptadas exatamente para a série do seu filho.
          </p>
        </div>

        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-bold mb-1">Para quem é?</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
               <span className="material-symbols-outlined text-primary mb-2">child_care</span>
               <p className="font-bold text-sm">Ensino Infantil</p>
               <p className="text-[10px] text-text-sub">Lúdico e visual</p>
            </div>
            <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
               <span className="material-symbols-outlined text-primary mb-2">school</span>
               <p className="font-bold text-sm">Ensino Fundamental</p>
               <p className="text-[10px] text-text-sub">Reforço e revisão</p>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-bold">O que você pode fazer?</h3>
          {[
            { icon: 'print', title: 'Imprimir Atividades', desc: 'PDFs prontos para praticar com lápis e papel.' },
            { icon: 'quiz', title: 'Quizzes Interativos', desc: 'Transforme o estudo em um jogo no celular.' },
            { icon: 'monitoring', title: 'Acompanhar Evolução', desc: 'Veja o desempenho em cada matéria.' }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined">{item.icon}</span>
              </div>
              <div>
                <p className="font-bold text-sm">{item.title}</p>
                <p className="text-xs text-text-sub dark:text-gray-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </section>
      </main>

      <div className="sticky bottom-0 left-0 right-0 p-4 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 z-40">
        <button 
          onClick={() => navigate('/exercicio-facil/criar')}
          className="w-full bg-primary hover:bg-primary-dark text-background-dark font-black text-lg h-14 rounded-2xl shadow-glow transition-transform active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Criar Exercício
        </button>
      </div>
    </div>
  );
};

export default ProgramPage;
