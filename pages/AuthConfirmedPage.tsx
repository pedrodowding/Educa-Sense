import React from 'react';
import { useNavigate } from 'react-router-dom';

const AuthConfirmedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-background-dark flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="size-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 shadow-lg animate-bounce-slow">
        <span className="material-symbols-outlined text-5xl">mark_email_read</span>
      </div>
      
      <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">E-mail confirmado!</h1>
      <p className="text-gray-500 font-medium mb-8 max-w-xs">
        Sua conta foi verificada com sucesso. Agora você já pode entrar e começar a usar o Educa Sense.
      </p>

      <button 
        onClick={() => navigate('/login')}
        className="w-full max-w-xs h-14 bg-primary text-black font-black rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        Ir para Login
        <span className="material-symbols-outlined">login</span>
      </button>
    </div>
  );
};

export default AuthConfirmedPage;
