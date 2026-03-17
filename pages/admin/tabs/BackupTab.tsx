import React from 'react';
import { formatDateTime } from '../adminUi';

type Props = {
  loading: boolean;
  backupPassphrase: string;
  onChangePassphrase: (v: string) => void;
  onRunBackup: () => void;
  lastBackupAt?: string | null;
};

const BackupTab: React.FC<Props> = ({ loading, backupPassphrase, onChangePassphrase, onRunBackup, lastBackupAt }) => {
  return (
    <section className="space-y-4">
      <div className="bg-white dark:bg-surface-dark p-4 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-3">
        <p className="text-sm font-black">Backup diário criptografado</p>
        <input
          type="password"
          value={backupPassphrase}
          onChange={e => onChangePassphrase(e.target.value)}
          placeholder="Chave de backup (não é salva)"
          className="w-full h-12 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 font-bold text-xs focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={onRunBackup}
          disabled={loading}
          className="w-full h-12 bg-primary text-black font-black rounded-2xl active:scale-95 transition-all text-xs"
        >
          {loading ? 'Gerando...' : 'Gerar backup agora'}
        </button>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Último backup</p>
          <p className="text-xs font-bold mt-1">{lastBackupAt ? formatDateTime(lastBackupAt) : '—'}</p>
        </div>
      </div>
    </section>
  );
};

export default BackupTab;

