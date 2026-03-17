import React, { useEffect, useState } from 'react';
import { ChildDevice } from '../../types';
import { supabase } from '../../services/supabase';

interface Props {
  childId: string;
}

const ChildDevicesSection: React.FC<Props> = ({ childId }) => {
  const [devices, setDevices] = useState<ChildDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchDevices = async () => {
      setDevicesLoading(true);
      setDevicesError(null);
      try {
        const { data, error } = await supabase
          .from('child_devices')
          .select('id, child_id, device_id, info, last_seen, created_at')
          .eq('child_id', childId)
          .order('last_seen', { ascending: false });
        if (error) throw error;
        if (cancelled) return;
        const mapped = (data || []).map((row: any) => ({
          id: row.id,
          childId: row.child_id,
          deviceId: row.device_id,
          userAgent: row.info?.userAgent,
          platform: row.info?.platform,
          language: row.info?.language,
          timezone: row.info?.timezone,
          screen: row.info?.screen,
          lastSeen: row.last_seen,
          createdAt: row.created_at
        })) as ChildDevice[];
        setDevices(mapped);
      } catch (e: any) {
        if (!cancelled) setDevicesError(e?.message || 'Não foi possível carregar os dispositivos.');
      } finally {
        if (!cancelled) setDevicesLoading(false);
      }
    };
    fetchDevices();
    return () => {
      cancelled = true;
    };
  }, [childId]);

  const getDeviceIcon = (device: ChildDevice) => {
    const ua = device.userAgent || '';
    if (/iPad|Tablet/i.test(ua)) return 'tablet_mac';
    if (/Android|iPhone|Mobile/i.test(ua)) return 'smartphone';
    return 'devices';
  };

  const getLastSeenLabel = (iso?: string) => {
    if (!iso) return 'Sem registro';
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMin <= 1) return 'Agora';
    if (diffMin < 60) return `Há ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Há ${diffH} h`;
    const diffD = Math.floor(diffH / 24);
    return `Há ${diffD} d`;
  };

  const isActive = (iso?: string) => {
    if (!iso) return false;
    const diffMs = Date.now() - new Date(iso).getTime();
    return diffMs <= 10 * 60 * 1000;
  };

  return (
    <section className="bg-white dark:bg-surface-dark p-6 rounded-[40px] shadow-soft border border-gray-100 dark:border-gray-800 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black">Dispositivos conectados</h3>
        {devicesLoading && <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
      </div>
      {devicesError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl p-4 text-xs font-bold">
          {devicesError}
        </div>
      )}
      {!devicesLoading && !devicesError && devices.length === 0 && (
        <div className="text-center py-8 opacity-40">
          <span className="material-symbols-outlined text-4xl">devices</span>
          <p className="text-xs font-bold mt-2">Nenhum dispositivo registrado ainda</p>
        </div>
      )}
      {!devicesLoading && !devicesError && devices.length > 0 && (
        <div className="space-y-3">
          {devices.slice(0, 5).map((d) => (
            <div key={d.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-3xl flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-xl bg-white dark:bg-surface-dark flex items-center justify-center shadow-sm text-primary">
                  <span className="material-symbols-outlined text-xl">{getDeviceIcon(d)}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black truncate max-w-[180px]">{d.platform || 'Dispositivo'}</p>
                    {isActive(d.lastSeen) && (
                      <span className="text-[8px] font-black uppercase tracking-widest text-green-600 bg-green-600/10 px-2 py-1 rounded-full">
                        Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-black uppercase text-text-sub tracking-widest">{getLastSeenLabel(d.lastSeen)}</p>
                  {(d.screen || d.timezone) && (
                    <p className="text-[10px] font-bold text-gray-400 mt-1">
                      {[d.screen, d.timezone].filter(Boolean).join(' • ')}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right text-[10px] font-bold text-gray-400 whitespace-nowrap">
                {d.deviceId.slice(0, 8)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ChildDevicesSection;

