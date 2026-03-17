import { supabase } from './supabase';
import { Badge, Child } from '../types';

export const LEVEL_BASE_XP = 100;

export const calculateLevel = (xp: number): number => {
  // Fórmula simples: Nível = floor(sqrt(XP / 100)) + 1
  // XP: 0 -> Lvl 1
  // XP: 100 -> Lvl 2
  // XP: 400 -> Lvl 3
  // XP: 900 -> Lvl 4
  if (xp < 0) return 1;
  return Math.floor(Math.sqrt(xp / LEVEL_BASE_XP)) + 1;
};

export const calculateNextLevelXp = (currentLevel: number): number => {
  // Inverso da fórmula: XP = (Nível)^2 * 100
  // Para alcançar Nível 2 (vindo do 1), precisa de 100 XP total.
  // Para alcançar Nível 3, precisa de 400 XP total.
  return Math.pow(currentLevel, 2) * LEVEL_BASE_XP;
};

export const awardXp = async (childId: string, amount: number, actionType: string, metadata?: any) => {
  // 1. Registrar Log
  const { error: logError } = await supabase.from('gamification_logs').insert({
    child_id: childId,
    action_type: actionType,
    xp_earned: amount,
    stars_earned: 0, // Estrelas podem ser calculadas separadamente ou passadas como param
    metadata: metadata || {}
  });

  if (logError) {
    console.error('Error logging XP:', logError);
    return null;
  }

  // 2. Atualizar Criança (Incrementar XP)
  // Idealmente faríamos isso via RPC/Trigger para garantir atomicidade,
  // mas faremos no client por enquanto para manter simples sem criar migrations complexas agora.
  
  // Buscar XP atual
  const { data: child, error: fetchError } = await supabase
    .from('children')
    .select('xp, stars')
    .eq('id', childId)
    .single();

  if (fetchError || !child) return null;

  const newXp = (child.xp || 0) + amount;
  
  const { error: updateError } = await supabase
    .from('children')
    .update({ xp: newXp })
    .eq('id', childId);

  if (updateError) return null;

  return newXp;
};

export const checkAndAwardBadges = async (childId: string): Promise<Badge[]> => {
  // Esta função verifica se o aluno cumpriu requisitos para badges e as atribui.
  // Pode ser chamada após completar um exercício.
  
  const newBadges: Badge[] = [];

  // Buscar histórico de exercícios para validação
  const { data: history } = await supabase
    .from('exercises')
    .select('*')
    .eq('child_id', childId)
    .eq('completed', true);

  if (!history) return [];

  // Buscar badges que o aluno JÁ tem
  const { data: existingBadgesData } = await supabase
    .from('child_badges')
    .select('badge_id')
    .eq('child_id', childId);
  
  const existingBadgeIds = new Set(existingBadgesData?.map((b: any) => b.badge_id) || []);

  // Regras Hardcoded por enquanto (idealmente viriam do banco 'badges.requirements')
  
  // 1. First Win
  if (!existingBadgeIds.has('first_win') && history.length >= 1) {
    await grantBadge(childId, 'first_win');
    newBadges.push({ id: 'first_win', name: 'Primeira Vitória', icon: 'emoji_events', description: '', category: 'milestone', xpBonus: 50 });
  }

  // 2. Math Explorer (5 Math Exercises)
  const mathCount = history.filter((e: any) => e.subject === 'Matemática').length;
  if (!existingBadgeIds.has('math_explorer') && mathCount >= 5) {
    await grantBadge(childId, 'math_explorer');
    newBadges.push({ id: 'math_explorer', name: 'Explorador Matemático', icon: 'calculate', description: '', category: 'subject', xpBonus: 100 });
  }

  // 3. Bookworm (5 Portuguese Exercises)
  const portCount = history.filter((e: any) => e.subject === 'Português').length;
  if (!existingBadgeIds.has('bookworm') && portCount >= 5) {
    await grantBadge(childId, 'bookworm');
    newBadges.push({ id: 'bookworm', name: 'Traça de Livros', icon: 'menu_book', description: '', category: 'subject', xpBonus: 100 });
  }

  return newBadges;
};

const grantBadge = async (childId: string, badgeId: string) => {
  // 1. Inserir na tabela de relacionamento
  const { error } = await supabase.from('child_badges').insert({
    child_id: childId,
    badge_id: badgeId
  });

  if (error) {
    console.error(`Error granting badge ${badgeId}:`, error);
    return;
  }

  // 2. Dar XP Bônus da Badge
  // Buscar XP da badge
  const { data: badge } = await supabase.from('badges').select('xp_bonus').eq('id', badgeId).single();
  if (badge && badge.xp_bonus > 0) {
    await awardXp(childId, badge.xp_bonus, 'badge_earned', { badgeId });
  }
};

export const fetchChildBadges = async (childId: string): Promise<Badge[]> => {
  const { data, error } = await supabase
    .from('child_badges')
    .select(`
      earned_at,
      badges (
        id,
        name,
        description,
        icon,
        category,
        xp_bonus
      )
    `)
    .eq('child_id', childId);

  if (error) {
    console.error('Error fetching badges:', error);
    return [];
  }

  return data.map((item: any) => ({
    id: item.badges.id,
    name: item.badges.name,
    description: item.badges.description,
    icon: item.badges.icon,
    category: item.badges.category,
    xpBonus: item.badges.xp_bonus,
    earnedAt: item.earned_at
  }));
};

export const fetchGamificationLogs = async (childId: string, days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('gamification_logs')
    .select('*')
    .eq('child_id', childId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching logs:', error);
    return [];
  }
  return data;
};
