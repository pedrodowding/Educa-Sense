import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { schoolService } from '../../services/schoolService';
import { useAuth } from '../../contexts/AuthContext';

export const DirectorImportPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ processed: number; errors: any[] } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      // Simple CSV Parser (assumes header: Student Name,Class Name,Grade)
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const parsed = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((h, i) => {
          if (h.includes('nome') || h.includes('student')) row.studentName = values[i];
          else if (h.includes('turma') || h.includes('class')) row.className = values[i];
          else if (h.includes('série') || h.includes('ano') || h.includes('grade')) row.grade = values[i];
        });
        return row;
      }).filter(r => r.studentName && r.className); // Filter valid rows

      setPreview(parsed);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!user || !preview.length || !file) return;

    setUploading(true);
    try {
      // Get Director's School ID
      const schoolData = await schoolService.getMySchool(user.id, 'director');
      if (!schoolData) {
        alert('Erro: Você não está vinculado a uma escola.');
        return;
      }

      const res = await schoolService.processBulkImport(
        schoolData.schoolId,
        user.id,
        file.name,
        preview
      );

      setResult(res);
      if (res.errors.length === 0) {
        setTimeout(() => navigate('/director/dashboard'), 2000);
      }
    } catch (error: any) {
      alert('Erro na importação: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background-dark p-6 pb-24">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-text-sub mb-2 cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/director/dashboard')}>
           <span className="material-symbols-outlined text-sm">arrow_back</span>
           <span className="text-xs font-bold uppercase">Voltar ao Painel</span>
        </div>
        <h1 className="text-3xl font-black text-primary">Importação em Massa</h1>
        <p className="text-sm text-text-sub">Cadastre alunos e turmas rapidamente via CSV</p>
      </header>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Upload Box */}
        <div className="bg-white dark:bg-surface-dark p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-soft text-center">
           {!file ? (
             <div className="space-y-4">
                <div className="size-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                   <span className="material-symbols-outlined text-4xl">upload_file</span>
                </div>
                <h3 className="text-xl font-bold">Arraste seu arquivo CSV aqui</h3>
                <p className="text-sm text-text-sub max-w-md mx-auto">
                  O arquivo deve conter as colunas: <strong>Nome do Aluno, Nome da Turma, Série</strong>.
                  <br/>As turmas serão criadas automaticamente se não existirem.
                </p>
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden" 
                  id="csv-upload"
                />
                <label 
                  htmlFor="csv-upload"
                  className="inline-block px-6 py-3 bg-primary text-black font-black rounded-xl cursor-pointer hover:scale-105 transition-transform"
                >
                  Selecionar Arquivo
                </label>
             </div>
           ) : (
             <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                   <span className="material-symbols-outlined text-primary">description</span>
                   <div className="text-left">
                      <p className="font-bold text-sm">{file.name}</p>
                      <p className="text-xs text-text-sub">{(file.size / 1024).toFixed(1)} KB • {preview.length} registros identificados</p>
                   </div>
                </div>
                <button onClick={() => { setFile(null); setPreview([]); setResult(null); }} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                   <span className="material-symbols-outlined">delete</span>
                </button>
             </div>
           )}
        </div>

        {/* Preview */}
        {preview.length > 0 && !result && (
          <div className="space-y-4 animate-fade-in">
             <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Pré-visualização ({preview.length} alunos)</h3>
                <button 
                  onClick={handleImport}
                  disabled={uploading}
                  className="px-6 py-3 bg-green-500 text-white font-black rounded-xl shadow-lg hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {uploading ? 'Importando...' : 'Confirmar Importação'}
                  {!uploading && <span className="material-symbols-outlined">check</span>}
                </button>
             </div>
             
             <div className="bg-white dark:bg-surface-dark rounded-[24px] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm overflow-x-auto">
                <table className="w-full text-left text-sm">
                   <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                      <tr>
                         <th className="p-4 font-black text-xs uppercase tracking-wider text-text-sub">Aluno</th>
                         <th className="p-4 font-black text-xs uppercase tracking-wider text-text-sub">Turma</th>
                         <th className="p-4 font-black text-xs uppercase tracking-wider text-text-sub">Série</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {preview.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                           <td className="p-4 font-bold">{row.studentName}</td>
                           <td className="p-4">{row.className}</td>
                           <td className="p-4 text-text-sub">{row.grade || '-'}</td>
                        </tr>
                      ))}
                      {preview.length > 5 && (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-xs text-text-sub font-bold uppercase bg-gray-50/50">
                             ... e mais {preview.length - 5} alunos
                          </td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`p-6 rounded-[24px] border-2 text-center animate-fade-in ${result.errors.length > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
             <div className={`size-16 rounded-full flex items-center justify-center mx-auto mb-4 ${result.errors.length > 0 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                <span className="material-symbols-outlined text-3xl">{result.errors.length > 0 ? 'warning' : 'check_circle'}</span>
             </div>
             <h3 className="text-xl font-black mb-1">Processamento Concluído</h3>
             <p className="text-sm font-bold opacity-70 mb-4">
               {result.processed} alunos importados com sucesso.<br/>
               {result.errors.length} erros encontrados.
             </p>
             
             {result.errors.length > 0 && (
               <div className="mt-4 bg-white/50 p-4 rounded-xl text-left max-h-40 overflow-y-auto text-xs font-mono">
                  {result.errors.map((e, i) => (
                    <div key={i} className="text-red-500 mb-1">
                       Linha {e.row}: {e.error}
                    </div>
                  ))}
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectorImportPage;