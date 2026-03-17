export type PlanTier = 'FREE' | 'PRO';

export interface PlanLimits {
  price: number;
  can_use_daily_plan: boolean;
  daily_plan_per_day_limit: number; // -1 for unlimited
  can_use_photo_correction: boolean;
  photo_correction_limit_per_week: number; // -1 for unlimited
  can_generate_activities: boolean;
  exercicio_facil_per_day_limit: number; // -1 for unlimited
  leitura_guiada_per_day_limit: number; // -1 for unlimited
  artes_criativas_per_day_limit: number; // -1 for unlimited
  ingles_todo_dia_per_day_limit: number; // -1 for unlimited
  can_access_teacher_mode: boolean;
  can_view_advanced_reports: boolean;
  can_print_activities: boolean;
  features: string[];
}

export const PLAN_CONFIG: Record<PlanTier, PlanLimits> = {
  FREE: {
    price: 0,
    can_use_daily_plan: true,
    daily_plan_per_day_limit: 1,
    can_use_photo_correction: true,
    photo_correction_limit_per_week: 1,
    can_generate_activities: true,
    exercicio_facil_per_day_limit: 3,
    leitura_guiada_per_day_limit: 1,
    artes_criativas_per_day_limit: 1,
    ingles_todo_dia_per_day_limit: 1,
    can_access_teacher_mode: false,
    can_view_advanced_reports: false,
    can_print_activities: false,
    features: [
      "5 exercícios por mês",
      "Quiz interativo básico",
      "Acesso a 1 perfil de filho"
    ]
  },
  PRO: {
    price: 29.90,
    can_use_daily_plan: true,
    daily_plan_per_day_limit: -1,
    can_use_photo_correction: true,
    photo_correction_limit_per_week: -1,
    can_generate_activities: true,
    exercicio_facil_per_day_limit: -1,
    leitura_guiada_per_day_limit: -1,
    artes_criativas_per_day_limit: -1,
    ingles_todo_dia_per_day_limit: -1,
    can_access_teacher_mode: true,
    can_view_advanced_reports: true,
    can_print_activities: true,
    features: [
      "Exercícios ilimitados",
      "Relatórios de evolução com IA",
      "Até 5 crianças por conta",
      "Exportação PDF profissional"
    ]
  },
};
