import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { logAdminAuditEvent } from '../../services/audit';
import {
  fetchAdminSettings,
  fetchApiUsageEvents,
  fetchAuditEvents,
  fetchFreeUsers,
  fetchSessions,
  upsertAdminSetting
} from './adminData';
import { buildCsv, buildExcelHtml, downloadTextFile, encryptJson } from './adminExport';
import { isOwnerAllowed, TabKey } from './adminUi';
import { RoleManager } from '../../services/roleManager';
import DashboardTab from './tabs/DashboardTab';
import UsersTab from './tabs/UsersTab';
import ApiTab from './tabs/ApiTab';
import LogsTab from './tabs/LogsTab';
import TimeTab from './tabs/TimeTab';
import BackupTab from './tabs/BackupTab';
import AdminFiltersBar from './components/AdminFiltersBar';

const AdminExclusivePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<TabKey>('dashboard');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const [users, setUsers] = useState<any[]>([]);
  const [usage, setUsage] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  const [settings, setSettings] = useState<Record<string, any>>({});
  const [backupPassphrase, setBackupPassphrase] = useState('');

  const allowed = profile?.role === 'admin' && isOwnerAllowed(user?.id);

  const onLog = (action: string, metadata?: Record<string, unknown>) => logAdminAuditEvent(action, metadata);

  const toIsoOrUndefined = (value: string): string | undefined => {
    const v = value?.trim();
    if (!v) return undefined;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString();
  };

  useEffect(() => {
    if (!allowed) return;
    logAdminAuditEvent('admin_panel_opened');
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    fetchAdminSettings()
      .then(setSettings)
      .catch(() => {});
  }, [allowed]);

  const reloadTab = async () => {
    setLoading(true);
    setError(null);
    try {
      const fromIso = toIsoOrUndefined(from);
      const toIso = toIsoOrUndefined(to);

      if (tab === 'dashboard') {
        // Dashboard fetches its own data
      } else if (tab === 'users') {
        const data = await fetchFreeUsers({ q, from: fromIso, to: toIso, limit: 500 });
        setUsers(data);
      } else if (tab === 'api') {
        const data = await fetchApiUsageEvents({
          userId: selectedUserId || undefined,
          q: q || undefined,
          from: fromIso,
          to: toIso,
          limit: 2000
        });
        setUsage(data);
      } else if (tab === 'logs') {
        const data = await fetchAuditEvents({
          actorUserId: selectedUserId || undefined,
          q: q || undefined,
          from: fromIso,
          to: toIso,
          limit: 2000
        });
        setAudit(data);
      } else if (tab === 'time') {
        const data = await fetchSessions({
          userId: selectedUserId || undefined,
          from: fromIso,
          to: toIso,
          limit: 5000
        });
        setSessions(data);
      } else if (tab === 'backup') {
        const [u, a, s] = await Promise.all([
          fetchFreeUsers({ limit: 5000 }),
          fetchAuditEvents({ limit: 5000 }),
          fetchSessions({ limit: 5000 })
        ]);
        setUsers(u);
        setAudit(a);
        setSessions(s);
      }

      logAdminAuditEvent('admin_tab_loaded', { tab, from, to, selectedUserId: selectedUserId || null });
    } catch (e: any) {
      setError(e?.message ? String(e.message) : 'Falha ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!allowed) return;
    reloadTab();
  }, [allowed, tab]);

  if (!allowed) return <Navigate to={user ? '/perfil' : '/login'} />;

  const exportRows = (filenameBase: string, rows: Record<string, unknown>[], mode: 'csv' | 'xls') => {
    if (mode === 'csv') downloadTextFile(`${filenameBase}.csv`, buildCsv(rows), 'text/csv;charset=utf-8');
    else downloadTextFile(`${filenameBase}.xls`, buildExcelHtml(rows), 'application/vnd.ms-excel;charset=utf-8');
  };

  const exportUsers = (mode: 'csv' | 'xls') => {
    const rows = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      plan: u.plan,
      created_at: u.created_at
    }));
    exportRows(`usuarios-free-${new Date().toISOString().slice(0, 10)}`, rows, mode);
    onLog('admin_export_users', { mode, count: rows.length });
  };

  const exportUsage = (mode: 'csv' | 'xls') => {
    const rows = usage.map(u => ({
      created_at: u.created_at,
      user_id: u.user_id,
      operation: u.operation,
      model: u.model,
      duration_ms: u.duration_ms,
      total_tokens: u.total_tokens,
      success: u.success,
      error_message: u.error_message
    }));
    exportRows(`api-usage-${new Date().toISOString().slice(0, 10)}`, rows, mode);
    onLog('admin_export_api_usage', { mode, count: rows.length });
  };

  const exportAudit = (mode: 'csv' | 'xls') => {
    const rows = audit.map(a => ({
      created_at: a.created_at,
      actor_user_id: a.actor_user_id,
      actor_role: a.actor_role,
      action: a.action,
      entity_type: a.entity_type,
      entity_id: a.entity_id
    }));
    exportRows(`audit-${new Date().toISOString().slice(0, 10)}`, rows, mode);
    onLog('admin_export_audit', { mode, count: rows.length });
  };

  const runBackup = async () => {
    if (!backupPassphrase) {
      setError('Defina uma chave de backup para criptografar os dados.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const generatedAt = new Date().toISOString();
      const payload = { generatedAt, users, audit, sessions };
      const encrypted = await encryptJson(payload, backupPassphrase);
      await upsertAdminSetting('daily_backup_latest', encrypted);
      await upsertAdminSetting('daily_backup_last_at', { at: generatedAt });
      downloadTextFile(`backup-${generatedAt.slice(0, 10)}.json`, JSON.stringify(encrypted), 'application/json;charset=utf-8');
      const refreshed = await fetchAdminSettings();
      setSettings(refreshed);
      onLog('admin_backup_generated', { sizeUsers: users.length, sizeAudit: audit.length, sizeSessions: sessions.length });
    } catch (e: any) {
      setError(e?.message ? String(e.message) : 'Falha ao gerar backup.');
    } finally {
      setLoading(false);
    }
  };

  const ensureDailyBackup = async () => {
    if (!backupPassphrase) return;
    const last = settings?.daily_backup_last_at?.at as string | undefined;
    const today = new Date().toISOString().slice(0, 10);
    if (last?.slice(0, 10) === today) return;
    await reloadTab();
    await runBackup();
  };

  useEffect(() => {
    if (!allowed) return;
    if (tab !== 'backup') return;
    ensureDailyBackup();
  }, [allowed, tab, backupPassphrase]);

  const onNavigateToUserFromDashboard = (userId: string) => {
    setSelectedUserId(userId);
    setTab('users');
  };

  return (
    <div className="flex flex-col min-h-full pb-10">
      <header className="p-6 pt-10 bg-black text-white rounded-b-[40px]">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => {
              RoleManager.setRole('guardian');
              navigate('/dashboard');
            }}
            className="size-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
            title="Voltar para Área dos Pais"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-sm font-black uppercase tracking-widest">Gestão Exclusiva</h1>
          <button 
            onClick={() => {
              RoleManager.setRole('guardian');
              navigate('/dashboard');
            }}
            className="h-10 px-4 rounded-full bg-white/10 flex items-center gap-2 hover:bg-white/20 transition-all text-white"
            title="Ir para Área dos Pais"
          >
            <span className="material-symbols-outlined text-sm">family_restroom</span>
            <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Módulo Pais</span>
          </button>
        </div>

        <div className="flex gap-2">
          {[
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'users', label: 'Usuários' },
            { key: 'api', label: 'API' },
            { key: 'logs', label: 'Logs' },
            { key: 'time', label: 'Tempo' },
            { key: 'backup', label: 'Backup' }
          ].map(t => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key as TabKey);
                if (t.key === 'users' && selectedUserId) {
                   // Keep selected user context if moving to users tab
                } else if (t.key === 'dashboard') {
                   setSelectedUserId(''); // Clear selection when going back to dashboard unless we want to keep it?
                }
                onLog('admin_tab_changed', { tab: t.key });
              }}
              className={`px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                tab === t.key ? 'bg-primary text-black' : 'bg-white/10 text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="p-6 space-y-6">
        {tab !== 'dashboard' && (
          <AdminFiltersBar
            tab={tab}
            q={q}
            from={from}
            to={to}
            selectedUserId={selectedUserId}
            users={users}
            loading={loading}
            error={error}
            onChangeQ={setQ}
            onChangeFrom={setFrom}
            onChangeTo={setTo}
            onChangeSelectedUserId={setSelectedUserId}
            onApply={reloadTab}
            onExportUsers={exportUsers}
            onExportUsage={exportUsage}
            onExportAudit={exportAudit}
          />
        )}

        {tab === 'dashboard' && <DashboardTab onNavigateToUser={onNavigateToUserFromDashboard} />}
        {tab === 'users' && <UsersTab users={users} selectedUserId={selectedUserId} onSelectUser={setSelectedUserId} onLog={onLog} />}
        {tab === 'api' && <ApiTab usage={usage} settings={settings} />}
        {tab === 'logs' && <LogsTab audit={audit} />}
        {tab === 'time' && <TimeTab sessions={sessions} onSelectUser={setSelectedUserId} />}
        {tab === 'backup' && (
          <BackupTab
            loading={loading}
            backupPassphrase={backupPassphrase}
            onChangePassphrase={setBackupPassphrase}
            onRunBackup={runBackup}
            lastBackupAt={settings?.daily_backup_last_at?.at}
          />
        )}
      </main>
    </div>
  );
};

export default AdminExclusivePage;
