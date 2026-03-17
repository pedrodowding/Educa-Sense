
export interface DailyPlanState {
  aluno_id: string;
  date: string; // YYYY-MM-DD
  steps_completed: [boolean, boolean, boolean];
  status: 'not_started' | 'in_progress' | 'done';
  stepsCount: number; // Helper derived property
  started_at?: string;
  finished_at?: string;
  mood?: 'feliz' | 'ok' | 'triste' | 'calmo' | 'agitado' | 'bravo';
  sleep?: 'bom' | 'medio' | 'ruim';
}
