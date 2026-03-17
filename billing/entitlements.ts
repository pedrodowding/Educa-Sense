import { PLAN_CONFIG, PlanTier, PlanLimits } from '../config/plans';
import { supabase } from '../services/supabase';

const TIER_STORAGE_KEY = 'educa_tier';
const QUOTA_PREFIX = 'educa_quota';

// Helper to get current date string YYYY-MM-DD
function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

// Helper to get current week key YYYY-Www
function getWeekKey(): string {
  const date = new Date();
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const year = d.getUTCFullYear();
  const weekNo = Math.ceil((((d.getTime() - new Date(Date.UTC(year, 0, 1)).getTime()) / 86400000) + 1) / 7);
  return `${year}-W${weekNo}`;
}

export function getUserTier(): PlanTier {
  try {
    const stored = localStorage.getItem(TIER_STORAGE_KEY);
    return (stored === 'PRO' ? 'PRO' : 'FREE') as PlanTier;
  } catch (e) {
    console.error('Error reading tier from localStorage', e);
    return 'FREE';
  }
}

export function setUserTier(tier: PlanTier) {
  try {
    localStorage.setItem(TIER_STORAGE_KEY, tier);
    // Force reload to apply changes if needed, or rely on React state
    window.dispatchEvent(new Event('tier-changed'));
  } catch (e) {
    console.error('Error saving tier to localStorage', e);
  }
}

// Function to sync tier from DB (Source of Truth)
export async function syncTierFromDB() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_status, subscription_tier')
            .eq('id', user.id)
            .single();

        if (profile?.subscription_status === 'active' && 
           (profile.subscription_tier === 'PRO' || profile.subscription_tier === 'pro')) {
            setUserTier('PRO');
        } else {
            // Only downgrade if explicitly inactive or free, to avoid accidents during race conditions
            // But for consistency, if DB says free, local should be free.
            setUserTier('FREE');
        }
    } catch (e) {
        console.error('Error syncing tier from DB', e);
    }
}

export function getEntitlements(tier?: PlanTier): PlanLimits {
  try {
    const currentTier = tier || getUserTier();
    return PLAN_CONFIG[currentTier] || PLAN_CONFIG['FREE'];
  } catch (e) {
    console.error('Error resolving entitlements', e);
    return PLAN_CONFIG['FREE'];
  }
}

export function isFeatureAllowed(featureKey: keyof PlanLimits): boolean {
  const limits = getEntitlements();
  const allowed = limits[featureKey];
  
  // If it's a boolean flag
  if (typeof allowed === 'boolean') {
    return allowed;
  }
  
  // If it's a numeric limit, we need to check quota
  // But this function just checks if the feature is enabled in general
  // For quota checks, use canPerformAction
  return true; 
}

export function getQuotaKey(featureKey: keyof PlanLimits): string | null {
  if (featureKey === 'daily_plan_per_day_limit') {
    return `${QUOTA_PREFIX}:daily_plan:${getTodayKey()}`;
  }
  if (featureKey === 'photo_correction_limit_per_week') {
    return `${QUOTA_PREFIX}:photo_correction:${getWeekKey()}`;
  }
  if (featureKey === 'exercicio_facil_per_day_limit') {
    return `${QUOTA_PREFIX}:exercicio_facil:${getTodayKey()}`;
  }
  if (featureKey === 'leitura_guiada_per_day_limit') {
    return `${QUOTA_PREFIX}:leitura_guiada:${getTodayKey()}`;
  }
  if (featureKey === 'artes_criativas_per_day_limit') {
    return `${QUOTA_PREFIX}:artes_criativas:${getTodayKey()}`;
  }
  if (featureKey === 'ingles_todo_dia_per_day_limit') {
    return `${QUOTA_PREFIX}:ingles_todo_dia:${getTodayKey()}`;
  }
  return null;
}

export function getUsage(featureKey: keyof PlanLimits): number {
  const key = getQuotaKey(featureKey);
  if (!key) return 0;
  const usage = localStorage.getItem(key);
  return usage ? parseInt(usage, 10) : 0;
}

export function getRemainingQuota(featureKey: keyof PlanLimits): number {
  const limits = getEntitlements();
  const limit = limits[featureKey];

  // If limit is boolean (shouldn't happen for quota check but for type safety)
  if (typeof limit === 'boolean') return limit ? Infinity : 0;

  // -1 means unlimited
  if (limit === -1) return Infinity;

  const usage = getUsage(featureKey);
  return Math.max(0, (limit as number) - usage);
}

export function canPerformAction(featureKey: keyof PlanLimits): boolean {
  const limits = getEntitlements();
  const limit = limits[featureKey];

  // Boolean feature gate
  if (typeof limit === 'boolean') {
    return limit;
  }

  // Unlimited
  if (limit === -1) return true;

  // Check usage
  const usage = getUsage(featureKey);
  return usage < (limit as number);
}

export function trackAction(featureKey: keyof PlanLimits) {
  const key = getQuotaKey(featureKey);
  if (!key) return;

  const currentUsage = getUsage(featureKey);
  localStorage.setItem(key, (currentUsage + 1).toString());
}

export function resetQuotas() {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith(QUOTA_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}

export const Entitlements = {
  getUserTier,
  setUserTier,
  syncTierFromDB,
  getEntitlements,
  isFeatureAllowed,
  getQuotaKey,
  getUsage,
  getRemainingQuota,
  canPerformAction,
  trackAction,
  resetQuotas
};
