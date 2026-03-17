import { TEXT_MODEL } from "../../lib/aiModels";
import { Exercise, Subject, Difficulty, Objective, ActivityFormat } from "../../types";
import { generateIllustration } from "./coloringService";
import { generateContentWithUsage, getSafeText } from "./generateContentWithUsage";
import { enforceQuestionConstraints, normalizeQuestions, parseJsonResponse, QuestionMode } from "./exerciseUtils";
import { progressService } from "../progressService";

// Redefine Type to avoid importing from @google/genai on client side
const Type = {
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  INTEGER: 'INTEGER',
  BOOLEAN: 'BOOLEAN',
  ARRAY: 'ARRAY',
  OBJECT: 'OBJECT',
} as const;

const baseParamsToExercise = (result: any, params: any): Exercise => ({
  id: Math.random().toString(36).substr(2, 9),
  pedagogicalObjective: 'Prática Geral',
  questions: [],
  title: `Atividade de ${params.subject}`,
  ...result,
  childId: params?.childId || '',
  childName: params.childName,
  childAge: params.age,
  grade: params.grade,
  subject: params.subject,
  difficulty: params.difficulty,
  createdAt: new Date().toISOString(),
  completed: false,
  selectedFormat: params.format,
  type: result.type || params.format // Ensure type is present
});

const getExerciseResponseSchema = (mode: QuestionMode, format?: string) => {
  const typeEnum =
    mode === 'multiple' ? ['multiple'] : mode === 'open' ? ['open'] : ['multiple', 'open'];
  
  // Force top-level type to match request
  const topLevelTypeEnum = format ? [format] : ['multipla', 'dissertativa', 'mista', 'leitura_guiada'];

  return {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      pedagogicalObjective: { type: Type.STRING },
      type: { type: Type.STRING, enum: topLevelTypeEnum }, // New required field
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            type: { type: Type.STRING, enum: typeEnum },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          }
        }
      }
    }
  };
};

const getQuestionsOnlySchema = (mode: QuestionMode) => {
  const typeEnum =
    mode === 'multiple' ? ['multiple'] : mode === 'open' ? ['open'] : ['multiple', 'open'];

  return {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            type: { type: Type.STRING, enum: typeEnum },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          }
        }
      }
    }
  };
};

const dedupeQuestionsByText = (questions: any[]) => {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const q of Array.isArray(questions) ? questions : []) {
    const key = (q?.text ? String(q.text) : '').trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
};

export const generateExercise = async (params: {
  childName: string;
  age: number;
  grade: string;
  subject: Subject;
  difficulty: Difficulty;
  objective: Objective;
  questionCount: number;
  format?: ActivityFormat; // Valid formats only
  questionMode?: QuestionMode; // Deprecated, keeping for compat
  childId?: string;
}): Promise<Exercise> => {
  const startTime = Date.now();
  
  // 1. Validation: Leitura Guiada is NOT allowed here
  if ((params.format as any) === 'leitura_guiada') {
    throw new Error('Leitura Guiada deve ser acessada pelo módulo específico.');
  }

  // 2. Determine QuestionMode from Format
  let mode: QuestionMode = 'multiple';
  if (params.format === 'dissertativa') mode = 'open';
  else if (params.format === 'mista') mode = 'mixed';
  else if (params.questionMode) mode = params.questionMode;

  // Fallback prevention
  if (!['multipla', 'dissertativa', 'mista'].includes(params.format || '') && !params.questionMode) {
      // If format is missing/invalid and no questionMode, default to multipla but warn
      console.warn(`[AI Exercise] Invalid/Missing format: ${params.format}. Defaulting to multiple.`);
      mode = 'multiple';
  }

  console.log(`[AI Exercise] Generating ${params.subject} for ${params.childName} using ${TEXT_MODEL} (Format: ${params.format}, Mode: ${mode})...`);
  
  // Fetch Child Context for AI Personalization
  let contextStr = "";
  if (params.childId) {
     try {
       const ctx = await progressService.getChildContextFromId(params.childId);
       if (ctx) {
         contextStr = `CONTEXTO PEDAGÓGICO DO ALUNO (PERSONALIZAÇÃO OBRIGATÓRIA):\n` +
         `- Nível Atual: ${ctx.level} (XP Total: ${ctx.total_xp})\n` +
         `- Média de Desempenho: ${ctx.avg_score.toFixed(1)}\n` +
         `- Pontos Fortes: ${ctx.strengths.join(', ') || "Ainda não identificados"}\n` +
         `- Dificuldades/Pontos a Melhorar: ${ctx.weaknesses.join(', ') || "Ainda não identificados"}\n` +
         `IMPORTANTE: Ajuste o tom e a complexidade das questões para este nível. Se o aluno tiver dificuldade na matéria atual, seja mais didático na explicação.`;
         console.log(`[AI Exercise] Context loaded for ${params.childName}: Level ${ctx.level}`);
       }
     } catch (e) {
       console.warn("[AI Exercise] Failed to load child context", e);
     }
  }

  const responseSchema = getExerciseResponseSchema(mode, params.format);
  const modeInstruction =
    mode === 'multiple'
      ? 'Todas as questões devem ser de múltipla escolha (type="multiple") com 4 opções.'
      : mode === 'open'
        ? 'Todas as questões devem ser dissertativas (type="open") sem opções.'
        : 'Faça uma mistura: metade múltipla escolha e metade dissertativa, mantendo o total exato.';

  const prompt = [
    `Crie exatamente ${params.questionCount} questões personalizadas para ${params.childName}, ${params.age} anos, ${params.grade}.`,
    `Matéria: ${params.subject}. Nível Solicitado: ${params.difficulty}. Objetivo: ${params.objective}.`,
    contextStr ? `\n${contextStr}\n` : '',
    `Formato solicitado: ${params.format || 'multipla'}.`,
    `Preferência dos pais: ${modeInstruction}`,
    `Regras:`,
    `- O campo "type" na raiz do JSON deve ser EXATAMENTE "${params.format || 'multipla'}".`,
    `- Para type="multiple" (nas questões): inclua "options" com 4 strings e "correctAnswer" deve ser exatamente uma dessas opções.`,
    `- Para type="open" (nas questões): NÃO inclua "options". Use "correctAnswer" como resposta esperada curta e objetiva.`,
    `Retorne apenas JSON no schema solicitado.`
  ].join('\n');
  
  const generateOnce = async (contents: string, operation: string) => {
    const response = await generateContentWithUsage({
      operation,
      request: {
        model: TEXT_MODEL,
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema,
          maxOutputTokens: 8192
        }
      }
    });

    const parsed = parseJsonResponse(getSafeText(response));
    // Validate Top Level Type
    if (parsed.type && params.format && parsed.type !== params.format) {
       console.warn(`[AI Exercise] Warning: Model returned type '${parsed.type}' but expected '${params.format}'. Correction applied.`);
       parsed.type = params.format;
    }

    const normalized = normalizeQuestions((parsed as any)?.questions);
    const enforced = enforceQuestionConstraints(normalized, mode, params.questionCount);
    return { parsed, enforced, usageMetadata: response.usageMetadata };
  };

  try {
    const first = await generateOnce(prompt, 'generate_exercise');

    if (!first.enforced.needsRepair && first.enforced.questions.length === params.questionCount) {
      const duration = Date.now() - startTime;
      console.log(`[AI Exercise] Success in ${duration}ms. Tokens approx: ${first.usageMetadata?.totalTokenCount}`);
      const exercise = baseParamsToExercise(first.parsed, params);
      return { ...exercise, questions: first.enforced.questions };
    }

    const repairPrompt = [
      `O JSON anterior não seguiu os requisitos.`,
      `Requisitos obrigatórios:`,
      `- Retorne exatamente ${params.questionCount} itens em "questions".`,
      mode === 'multiple'
        ? `- Todas as questões devem ser type="multiple" com "options" (4 strings) e "correctAnswer" deve ser uma dessas opções.`
        : mode === 'open'
          ? `- Todas as questões devem ser type="open" sem "options".`
          : `- Metade type="multiple" e metade type="open", mantendo o total exato.`,
      `JSON anterior (apenas questions): ${JSON.stringify((first.parsed as any)?.questions ?? [])}`,
      `Retorne apenas JSON no schema solicitado.`
    ].join('\n');

    const second = await generateOnce(repairPrompt, 'generate_exercise_repair');
    if (!second.enforced.needsRepair && second.enforced.questions.length === params.questionCount) {
      const duration = Date.now() - startTime;
      console.log(`[AI Exercise] Repaired in ${duration}ms.`);
      const exercise = baseParamsToExercise(second.parsed, params);
      return { ...exercise, questions: second.enforced.questions };
    }

    const baseQuestions = second.enforced.questions;
    const missing = params.questionCount - baseQuestions.length;
    if (missing > 0 && baseQuestions.length > 0) {
      const baseTexts = baseQuestions.map(q => q.text).filter(Boolean);
      const fillPrompt = [
        `Gere exatamente ${missing} novas questões.`,
        `Contexto: ${params.childName}, ${params.age} anos, ${params.grade}. Matéria: ${params.subject}. Nível: ${params.difficulty}. Objetivo: ${params.objective}.`,
        `Regras:`,
        mode === 'multiple'
          ? `- Todas devem ser type="multiple" com "options" (4 strings) e "correctAnswer" deve ser uma dessas opções.`
          : mode === 'open'
            ? `- Todas devem ser type="open" sem "options".`
            : `- Respeite o modo misto mantendo o total exato.`,
        `- Não repita nenhuma das questões abaixo (compare por texto):`,
        JSON.stringify(baseTexts),
        `Retorne apenas JSON no schema solicitado.`
      ].join('\n');

      const fillResponse = await generateContentWithUsage({
        operation: 'generate_exercise_fill',
        request: {
          model: TEXT_MODEL,
          contents: fillPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: getQuestionsOnlySchema(mode),
            maxOutputTokens: 8192
          }
        }
      });

      const fillParsed = parseJsonResponse(fillResponse.text);
      const fillNormalized = normalizeQuestions((fillParsed as any)?.questions);

      const merged = dedupeQuestionsByText([
        ...baseQuestions,
        ...fillNormalized
      ]);

      const enforcedMerged = enforceQuestionConstraints(merged as any, mode, params.questionCount);
      if (!enforcedMerged.needsRepair && enforcedMerged.questions.length === params.questionCount) {
        const duration = Date.now() - startTime;
        console.log(`[AI Exercise] Filled in ${duration}ms.`);
        const exercise = baseParamsToExercise(second.parsed, params);
        return { ...exercise, questions: enforcedMerged.questions };
      }
    }

    throw new Error('A IA não retornou questões válidas no formato solicitado.');
  } catch (err) {
    console.error(`[AI Exercise] Error:`, err);
    throw err;
  }
};

export const verifyAnswer = async (
  questionText: string,
  correctAnswer: string,
  userAnswer: string
): Promise<{ isCorrect: boolean; feedback: string }> => {
  const prompt = `
    Analise a resposta de uma criança para a seguinte pergunta escolar:
    Pergunta: "${questionText}"
    Resposta Esperada (Gabarito): "${correctAnswer}"
    Resposta da Criança: "${userAnswer}"

    Sua tarefa:
    1. Determine se a resposta da criança está correta (considerando sinônimos, erros ortográficos leves e sentido geral).
    2. Forneça um feedback curto, encorajador e educativo (max 2 frases).
    
    Se a resposta for muito vaga ou nada a ver, considere incorreta.

    Retorne APENAS um JSON:
    { "isCorrect": boolean, "feedback": "string" }
  `;

  const response = await generateContentWithUsage({
    operation: 'verify_answer',
    request: {
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING }
          }
        }
      }
    }
  });

  return JSON.parse(response.text || '{ "isCorrect": false, "feedback": "Não consegui validar. Tente novamente." }');
};

export const generateReadingExercise = async (params: {
  childName: string;
  age: number;
  grade: string;
  interest: string;
  difficulty: Difficulty;
  questionCount: number;
  questionMode?: QuestionMode;
}): Promise<Exercise & { imageUrl?: string }> => {
  const mode = params.questionMode ?? 'multiple';
  const modeInstruction =
    mode === 'multiple'
      ? 'Faça todas as perguntas como múltipla escolha (type="multiple") com 4 opções.'
      : mode === 'open'
        ? 'Faça todas as perguntas como dissertativas (type="open") sem opções.'
        : 'Faça metade múltipla escolha e metade dissertativa, mantendo o total exato.';

  const prompt = [
    `Crie uma história curta para ${params.childName} sobre ${params.interest}.`,
    `Nível: ${params.difficulty}.`,
    `Após a história, inclua exatamente ${params.questionCount} perguntas de interpretação.`,
    `Preferência dos pais: ${modeInstruction}`,
    `Regras:`,
    `- Para type="multiple": inclua "options" com 4 strings e "correctAnswer" deve ser uma dessas opções.`,
    `- Para type="open": NÃO inclua "options". Use "correctAnswer" como resposta esperada curta.`,
    `Retorne apenas JSON no schema solicitado.`
  ].join('\n');
  
  const response = await generateContentWithUsage({
    operation: 'generate_reading_exercise',
    request: {
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            pedagogicalObjective: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['leitura_guiada'] }, // Enforce type
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['multiple', 'open'] },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    }
  });
  const parsed = parseJsonResponse(response.text);
  const imageUrl = await generateIllustration(`${parsed.title || 'História'} - ${params.interest}`);
  const exercise = baseParamsToExercise(parsed, { ...params, subject: Subject.PORTUGUESE, objective: Objective.REINFORCE, type: 'leitura_guiada', selectedFormat: 'leitura_guiada' });
  const content = parsed.content || '';
  return {
    ...exercise,
    pedagogicalObjective: `${content}|||${exercise.pedagogicalObjective}`,
    questions: normalizeQuestions((parsed as any)?.questions),
    imageUrl
  };
};

export const generateArtsExercise = async (params: {
  childName: string;
  age: number;
  grade: string;
  theme: string;
  materials: string;
  difficulty: Difficulty;
  questionCount: number;
}): Promise<Exercise> => {
  const prompt = `Crie uma missão artística criativa com ${params.questionCount} etapas para ${params.childName}, nível ${params.difficulty}. Tema: ${params.theme}. Materiais: ${params.materials}. JSON.`;
  
  const response = await generateContentWithUsage({
    operation: 'generate_arts_exercise',
    request: {
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            pedagogicalObjective: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['open'] },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    }
  });
  const parsed = parseJsonResponse(response.text);
  const imageUrl = await generateIllustration(`Missão de arte: ${params.theme}`);
  const exercise = baseParamsToExercise(parsed, { ...params, subject: Subject.ART, objective: Objective.REINFORCE });
  return { ...exercise, questions: normalizeQuestions((parsed as any)?.questions), imageUrl };
};

export const generateEnglishExercise = async (params: {
  childName: string;
  age: number;
  grade: string;
  theme: string;
  difficulty: Difficulty;
  questionCount: number;
  questionMode?: QuestionMode;
}): Promise<Exercise> => {
  const mode = params.questionMode ?? 'multiple';
  const modeInstruction =
    mode === 'multiple'
      ? 'Todos devem ser múltipla escolha (type="multiple") com 4 opções.'
      : mode === 'open'
        ? 'Todos devem ser dissertativos (type="open") sem opções.'
        : 'Faça uma mistura: metade múltipla escolha e metade dissertativa, mantendo o total exato.';

  const prompt = [
    `Crie exatamente ${params.questionCount} exercícios de inglês lúdicos para ${params.childName}, nível ${params.difficulty}.`,
    `Tema: ${params.theme}.`,
    `Preferência dos pais: ${modeInstruction}`,
    `Regras:`,
    `- Para type="multiple": inclua "options" com 4 strings e "correctAnswer" deve ser uma dessas opções.`,
    `- Para type="open": NÃO inclua "options". Use "correctAnswer" como resposta esperada curta.`,
    `Retorne apenas JSON no schema solicitado.`
  ].join('\n');
  
  const response = await generateContentWithUsage({
    operation: 'generate_english_exercise',
    request: {
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            pedagogicalObjective: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['multiple', 'open'] },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    }
  });
  const parsed = parseJsonResponse(response.text);
  const normalized = normalizeQuestions((parsed as any)?.questions);
  const enforced = enforceQuestionConstraints(normalized, mode, params.questionCount);

  if (enforced.needsRepair || enforced.questions.length !== params.questionCount) {
    const repairPrompt = [
      `O JSON anterior não seguiu os requisitos.`,
      `Requisitos obrigatórios:`,
      `- Retorne exatamente ${params.questionCount} itens em "questions".`,
      mode === 'multiple'
        ? `- Todas as questões devem ser type="multiple" com "options" (4 strings) e "correctAnswer" deve ser uma dessas opções.`
        : mode === 'open'
          ? `- Todas as questões devem ser type="open" sem "options".`
          : `- Metade type="multiple" e metade type="open", mantendo o total exato.`,
      `JSON anterior: ${JSON.stringify(parsed)}`,
      `Retorne apenas JSON no schema solicitado.`
    ].join('\n');

    const repairedResponse = await generateContentWithUsage({
      operation: 'generate_english_exercise_repair',
      request: {
        model: TEXT_MODEL,
        contents: repairPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: getExerciseResponseSchema(mode),
          maxOutputTokens: 8192
        }
      }
    });
    const repaired = parseJsonResponse(repairedResponse.text);
    const repairedNormalized = normalizeQuestions((repaired as any)?.questions);
    const repairedEnforced = enforceQuestionConstraints(repairedNormalized, mode, params.questionCount);
    if (repairedEnforced.needsRepair || repairedEnforced.questions.length !== params.questionCount) {
      throw new Error('A IA não retornou questões válidas no formato solicitado.');
    }
    const exercise = baseParamsToExercise(repaired, params);
    return { ...exercise, questions: repairedEnforced.questions };
  }

  const exercise = baseParamsToExercise(parsed, params);
  return { ...exercise, questions: enforced.questions };
};
