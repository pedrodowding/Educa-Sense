import React, { useState } from 'react';

interface Props {
  myCode: string | null;
  loadingCode: boolean;
  onSendRequest: (code: string) => Promise<{ success: boolean; error?: string }>;
}

export const AddFriendByCode: React.FC<Props> = ({ myCode, loadingCode, onSendRequest }) => {
  const [inputCode, setInputCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleCopy = () => {
    if (myCode) {
      navigator.clipboard.writeText(myCode);
      // Opcional: mostrar toast
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setSubmitting(true);
    setFeedback(null);

    console.log('Enviando convite:', {
      code: inputCode.trim(),
      // Nota: o childId vem do hook useMyFriendCode ou props pai, 
      // mas aqui só temos o myCode. O envio real acontece no onSendRequest que usa o childId do contexto.
    });

    const result = await onSendRequest(inputCode.trim());
    console.log('Resultado convite:', result);

    if (result.success) {
      setFeedback({ type: 'success', message: 'Convite enviado!' });
      setInputCode('');
    } else {
      let msg = 'Erro ao enviar convite.';
      if (result.error === 'INVALID_CODE') msg = 'Código não encontrado.';
      if (result.error === 'SELF_INVITE') msg = 'Você não pode adicionar a si mesmo.';
      if (result.error === 'ALREADY_FRIENDS') msg = 'Vocês já são amigos!';
      if (result.error === 'ALREADY_PENDING') msg = 'Já existe um convite pendente.';
      if (result.error === 'UNAUTHORIZED') msg = 'Permissão negada. Verifique se você é o responsável.';
      if (result.error === 'FRIENDS_DISABLED') msg = 'Este amigo não está aceitando convites no momento.';
      
      // Fallback para outros erros
      if (msg === 'Erro ao enviar convite.' && result.error) {
         msg = `Erro: ${result.error}`;
      }
      
      setFeedback({ type: 'error', message: msg });
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Meu Código */}
      <div className="bg-primary/10 p-6 rounded-3xl text-center border-2 border-primary/20">
        <h3 className="text-sm font-bold text-text-sub uppercase tracking-wider mb-2">Seu Código de Amigo</h3>
        <div className="flex items-center justify-center gap-3 mb-2">
          {loadingCode ? (
            <div className="h-10 w-32 bg-gray-200 animate-pulse rounded-lg" />
          ) : (
            <span className="text-4xl font-black text-primary-dark tracking-widest font-display">
              {myCode || '---'}
            </span>
          )}
        </div>
        <button 
          onClick={handleCopy}
          className="text-sm font-bold text-primary-dark hover:text-primary transition-colors flex items-center justify-center gap-1 mx-auto"
        >
          <span className="material-symbols-outlined text-lg">content_copy</span>
          Toque para copiar
        </button>
      </div>

      {/* Adicionar Amigo */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-text-main mb-4">Adicionar um amigo</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-text-sub mb-1">
              Código do amigo
            </label>
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="Ex: A1B2C3D4"
              className="w-full h-14 px-4 rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none text-xl font-bold uppercase tracking-widest text-center transition-all"
              maxLength={8}
            />
          </div>

          {feedback && (
            <div className={`p-3 rounded-xl text-sm font-bold text-center ${
              feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {feedback.message}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !inputCode}
            className="w-full h-14 bg-primary text-black font-black text-lg rounded-xl shadow-glow active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span className="animate-spin material-symbols-outlined">progress_activity</span>
            ) : (
              <>
                Enviar Convite
                <span className="material-symbols-outlined">send</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
