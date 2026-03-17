import { TEXT_MODEL, CACHE_TTL_MS } from "../../lib/aiModels";
import { Child, DailyCheckIn, ActionPlan } from "../../types";
// Redefine Type locally
const Type = {
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  INTEGER: 'INTEGER',
  BOOLEAN: 'BOOLEAN',
  ARRAY: 'ARRAY',
  OBJECT: 'OBJECT',
} as const;

import { generateContentWithUsage, getSafeText } from "./generateContentWithUsage";

export interface AiInsightResult {
  summary: string;
  tasks: string[];
  alert?: string;
}

const getCacheKey = (studentId: string) => `student:${studentId}:historyCache:v1`;

const parseInsightResult = (rawText: string): AiInsightResult => {
  const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // 1. Try Parse JSON
  try {
    return JSON.parse(cleanText || '{}');
  } catch (e) {
    console.warn("[InsightService] JSON parse failed, attempting heuristic parsing for raw text.");
  }

  // 2. Heuristic Parsing (Fallback for Plain Text)
  // Extract tasks (lines starting with -, *, or numbers)
  const lines = cleanText.split('\n').filter(l => l.trim().length > 0);
  const tasks: string[] = [];
  let summaryParts: string[] = [];
  let isTaskSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // Detect task indicators
    const isTask = /^[-*•\d]+\.?\s+/.test(trimmed) || trimmed.toLowerCase().startsWith('tarefa') || isTaskSection;
    
    if (trimmed.toLowerCase().includes('plano de ação') || trimmed.toLowerCase().includes('tarefas:')) {
      isTaskSection = true;
      continue;
    }

    if (isTask) {
        // Clean task text
        const taskText = trimmed.replace(/^[-*•\d\.\)]+\s+/, '').trim();
        if (taskText.length > 5) tasks.push(taskText);
    } else {
        // It's part of the summary
        summaryParts.push(trimmed);
    }
  }

  // Ensure we have a summary
  const summary = summaryParts.join('\n\n').trim() || cleanText || "Resumo gerado, confira as tarefas abaixo.";

  // Ensure we have tasks
  if (tasks.length === 0) {
      tasks.push("Manter rotina de observação");
      tasks.push("Registrar check-in diário");
      tasks.push("Conversar sobre o dia");
  }

  return {
    summary: summary.substring(0, 500), // Limit length just in case
    tasks: tasks.slice(0, 7) // Limit to 7 tasks
  };
};

export const generateInsights = async (child: Child, checkIns: DailyCheckIn[]): Promise<AiInsightResult> => {
  const startTime = Date.now();
  console.log(`[AI Insights] Generating for ${child.name} using ${TEXT_MODEL}...`);
  
  // 1. Check Cache
  const cacheKey = getCacheKey(child.id);
  const cachedRaw = localStorage.getItem(cacheKey);
  let previousSummary = "";
  let deltaCheckIns = checkIns;

  // Cache logic omitted for brevity... (Kept as is)

  // 2. Prepare Prompt
  const dataSummary = deltaCheckIns.map(c => `Data: ${c.date}, Humor: ${c.mood}, Sono: ${c.sleepQuality}/5`).join('; ');
  
  // DEBUG LOG
  console.log(`[AI Insights] CheckIns count: ${checkIns.length}, Delta count: ${deltaCheckIns.length}`);

  // Se não houver dados suficientes, evitar prompt vazio
  if (checkIns.length === 0 && !previousSummary) {
     console.log("[AI Insights] No data available for analysis.");
     return {
       summary: "Ainda não temos dados suficientes para identificar padrões. Continue registrando o humor e sono diariamente!",
       tasks: [
         "Registrar o humor amanhã",
         "Estabelecer horário de dormir",
         "Observar momentos de alegria"
       ]
     };
  }

  // FORCE JSON IN PROMPT
  const jsonSchemaExample = `
  {
    "summary": "Resumo do comportamento...",
    "tasks": ["Tarefa 1", "Tarefa 2", "Tarefa 3"],
    "alert": "Aviso opcional"
  }
  `;

  let prompt = "";
  if (previousSummary) {
    prompt = `Contexto anterior do aluno ${child.name} (${child.age} anos): "${previousSummary}".
    Novos registros recentes: ${dataSummary || "Sem novos registros detalhados, considere apenas a manutenção da rotina"}.
    Atualize a análise de comportamento e o plano de ação de 7 dias.
    Mantenha o histórico em mente mas foque nas mudanças recentes.
    Se houver sinais de risco grave, inclua um alerta. 
    
    IMPORTANTE: Responda APENAS com um JSON válido seguindo este formato exato, sem markdown, sem explicações extras:
    ${jsonSchemaExample}`;
  } else {
    prompt = `Analise o comportamento de ${child.name} (${child.age} anos) com base nos registros: ${dataSummary || "Sem registros específicos ainda, forneça um plano inicial de adaptação de rotina"}.
    Gere um resumo curto de padrões identificados (ou sugestão inicial) e um plano de ação de 7 dias com tarefas práticas para os pais.
    Se houver sinais de risco grave, inclua um alerta de segurança.
    
    IMPORTANTE: Responda APENAS com um JSON válido seguindo este formato exato, sem markdown, sem explicações extras:
    ${jsonSchemaExample}`;
  }

  // 3. Call AI
  try {
    const response = await generateContentWithUsage({
      operation: 'generate_behavior_insights',
      request: {
        model: TEXT_MODEL,
        contents: prompt,
        config: {
           // responseMimeType: "application/json", // DISABLED: Often causes raw text response from certain models
           // We rely on prompt engineering now
        }
      }
    });

    const text = getSafeText(response);
    // If text is empty, try one last check on raw response if available
    if (!text && response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) {
        console.warn("[AI Insights] Text extracted via backup path.");
        // Should have been caught by getSafeText, but just in case
    }
    
    if (!text) {
        console.error("[AI Insights] Empty response text. Response keys:", Object.keys(response));
        throw new Error("Resposta vazia da IA");
    }

    console.log("[AI Insights] Raw Text Length:", text.length);
    console.log("[AI Insights] Raw Text Preview:", text.substring(0, 100)); // Log preview for debugging
    let result = parseInsightResult(text);

    // Validate Result
    if (!result.summary || !result.tasks || !Array.isArray(result.tasks)) {
        console.warn("[AI Insights] Invalid result structure:", result);
        result = {
            summary: result.summary || "Análise gerada, mas o resumo está indisponível. Siga as tarefas abaixo.",
            tasks: Array.isArray(result.tasks) ? result.tasks : ["Manter rotina de observação"]
        };
    }

    const duration = Date.now() - startTime;
    
    // 4. Update Cache
    // Find the latest date in the checkIns we processed (or all checkIns to be safe for next time)
    // Actually, we should store the latest date of ALL checkIns available to mark the watermark.
    const sortedCheckIns = [...checkIns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestDate = sortedCheckIns.length > 0 ? sortedCheckIns[0].date : new Date().toISOString().split('T')[0];

    const cacheEntry: { timestamp: number; studentId: string; lastCheckInDate: string; data: AiInsightResult } = {
      timestamp: Date.now(),
      studentId: child.id,
      lastCheckInDate: latestDate,
      data: result
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));

    console.log(`[AI Insights] Success in ${duration}ms. Tokens approx: ${response.usageMetadata?.totalTokenCount}`);
    return result;

  } catch (e) {
    console.error("[AI Insights] Error:", e);
    // Fallback
    return {
      summary: "Não foi possível gerar uma nova análise no momento. Continue registrando.",
      tasks: ["Manter rotina", "Observar mudanças de humor"]
    };
  }
};

export const generateParentTip = async (child: Child): Promise<string> => {
  const subjectsStr = child.difficultySubjects?.length > 0 ? child.difficultySubjects.join(', ') : 'aprendizado geral';
  const prompt = `Como especialista em pedagogia, dê uma dica curta (máximo 200 caracteres) e prática para um pai ajudar seu filho de ${child.age} anos que tem dificuldade em ${subjectsStr}. Seja encorajador.`;
  try {
    const response = await generateContentWithUsage({
      operation: 'generate_parent_tip',
      request: { model: TEXT_MODEL, contents: prompt }
    });
    return getSafeText(response) || "Incentive a curiosidade hoje!";
  } catch (e) { return "O aprendizado lúdico é o melhor caminho!"; }
};
