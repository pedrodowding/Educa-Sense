import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChildren } from '../hooks/useChildren';
import { Subject, Child } from '../types';
import { Entitlements } from '../billing/entitlements';
import { PaywallModal } from '../components/PaywallModal';

const CorrectPhotoPage: React.FC = () => {
  const navigate = useNavigate();
  const { children } = useChildren();
  
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [subject, setSubject] = useState<string>(Subject.MATH);
  const [activityType, setActivityType] = useState<string>('multiple_choice');
  const [grade, setGrade] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
      setGrade(children[0].grade);
    }
  }, [children, selectedChildId]);

  useEffect(() => {
    if (selectedChildId) {
      const child = children.find(c => c.id === selectedChildId);
      if (child) setGrade(child.grade);
    }
  }, [selectedChildId, children]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    setPreviewUrl(null);
  };

  const analyzeExercisePhoto = async () => {
    // Mock implementation
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Randomly succeed or fail for testing UI
        const success = Math.random() > 0.1;
        if (success) {
          resolve({ score: 8.5, feedback: "Bom trabalho! Atenção na questão 3." });
        } else {
          reject(new Error("Falha ao processar imagem"));
        }
      }, 2000);
    });
  };

  const handleSubmit = async () => {
    if (!photo) {
      setError("Envie uma foto para continuar.");
      return;
    }

    // Check Entitlements
    if (!Entitlements.canPerformAction('photo_correction_limit_per_week')) {
      setShowPaywall(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await analyzeExercisePhoto();
      
      // Track usage on success
      Entitlements.trackAction('photo_correction_limit_per_week');
      
      alert("Análise concluída com sucesso! (Mock)");
      navigate('/dashboard'); // Or results page
    } catch (err) {
      setError("Não consegui ler a foto. Tente novamente com mais luz e foco.");
    } finally {
      setLoading(false);
    }
  };

  const selectedChild = children.find(c => c.id === selectedChildId);

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-background-dark">
      {/* Header */}
      <header className="p-6 pt-10 flex items-center gap-4 border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => navigate(-1)} className="size-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center transition-colors hover:bg-gray-200">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-black text-primary">Corrigir exercício</h1>
          <p className="text-xs text-text-sub font-medium">
            {selectedChild ? `Para: ${selectedChild.name}` : 'Selecione um aluno'}
          </p>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8 pb-32 overflow-y-auto">
        
        {/* Student Selector (if multiple) */}
        {children.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  selectedChildId === child.id 
                    ? 'bg-primary text-black' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                }`}
              >
                {child.name}
              </button>
            ))}
          </div>
        )}

        {/* Upload Area */}
        <div className="space-y-2">
          <label className="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-white">
            Foto da Atividade
          </label>
          
          {previewUrl ? (
            <div className="relative rounded-[24px] overflow-hidden border-2 border-gray-100 dark:border-gray-800 shadow-soft group">
              <img src={previewUrl} alt="Preview" className="w-full h-64 object-cover" />
              <button 
                onClick={handleRemovePhoto}
                className="absolute top-4 right-4 size-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-64 bg-gray-50 dark:bg-gray-800/50 rounded-[32px] border-2 border-dashed border-gray-300 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <div className="size-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl">add_a_photo</span>
              </div>
              <p className="font-bold text-gray-600 dark:text-gray-300">Tirar foto ou escolher</p>
              <p className="text-xs text-gray-400 mt-1">Formatos: JPG, PNG</p>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </label>
          )}
          
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
             <span className="material-symbols-outlined text-blue-500 text-lg mt-0.5">info</span>
             <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-tight">
               <strong>Dica:</strong> Evite dados pessoais na foto. Use boa luz e enquadre a folha inteira para melhor correção.
             </p>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-500">Matéria</label>
            <select 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 font-bold text-sm outline-none border-2 border-transparent focus:border-primary transition-all"
            >
              {Object.values(Subject).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500">Tipo</label>
              <select 
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 font-bold text-sm outline-none border-2 border-transparent focus:border-primary transition-all"
              >
                <option value="multiple_choice">Múltipla Escolha</option>
                <option value="short_answer">Resposta Curta</option>
                <option value="calculation">Cálculo</option>
                <option value="text">Texto / Redação</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500">Série</label>
              <input 
                type="text" 
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="Ex: 3º Ano"
                className="w-full h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 font-bold text-sm outline-none border-2 border-transparent focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center gap-3 animate-fade-in">
            <span className="material-symbols-outlined">error</span>
            <p className="text-xs font-bold">{error}</p>
          </div>
        )}

      </main>

      {/* Footer Actions */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 dark:bg-background-dark/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 z-50">
        <div className="max-w-md mx-auto">
          <button 
            onClick={handleSubmit}
            disabled={loading || !photo}
            className={`w-full h-14 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all ${
              loading || !photo 
                ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed' 
                : 'bg-primary text-black shadow-glow active:scale-95'
            }`}
          >
            {loading ? (
              <>
                <div className="size-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                <span className="text-sm">Analisando foto...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">document_scanner</span>
                Analisar e Corrigir
              </>
            )}
          </button>
        </div>
      </footer>

      <PaywallModal 
        isOpen={showPaywall} 
        onClose={() => setShowPaywall(false)} 
        featureName="Correção por Foto"
      />
    </div>
  );
};

export default CorrectPhotoPage;
