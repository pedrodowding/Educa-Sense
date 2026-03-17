import { ProgressSummary, SubjectProgress } from './progressService';

export const eduzinhoInsightsService = {
  generateProgressInsight(summary: ProgressSummary | null, subjectProgress: SubjectProgress[]): string {
    if (!summary) {
      return "Olá! Comece suas atividades para eu poder te ajudar a evoluir!";
    }

    // 1. Streak (Consistência)
    if (summary.streak_days >= 3) {
      return `Uau! ${summary.streak_days} dias seguidos aprendendo! Sua consistência é incrível! 🚀`;
    }

    // 2. High Accuracy (Excelência)
    if (summary.average_accuracy >= 90 && summary.completed_activities >= 5) {
      return "Sua precisão está fantástica! Você está dominando os assuntos! 🌟";
    }

    // 3. Subject Improvement (Melhoria em matéria específica)
    // Find subject with highest accuracy (if > 70%)
    const bestSubject = subjectProgress.reduce((prev, current) => 
      (current.average_accuracy > prev.average_accuracy) ? current : prev
    , { average_accuracy: 0, subject: '' } as SubjectProgress);

    if (bestSubject.average_accuracy >= 80) {
      return `Você está brilhando em ${bestSubject.subject}! Continue assim! 📚`;
    }

    // 4. Low Completion Rate (Incentivo)
    if (summary.completion_rate < 50 && summary.total_activities > 0) {
      return "Vamos terminar as atividades pendentes? Você consegue! 💪";
    }

    // 5. XP Milestone (Conquista)
    if (summary.total_xp > 1000) {
      return "Mais de 1000 XP! Você já é um explorador experiente! 🏆";
    }

    // Default encouragement
    return "Cada atividade completada é um passo rumo ao conhecimento! Divirta-se aprendendo! ✨";
  }
};
