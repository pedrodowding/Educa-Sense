
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Exercise, Subject, Difficulty, Objective, Child, DailyCheckIn, ActionPlan } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const baseParamsToExercise = (result: any, params: any): Exercise => ({
  id: Math.random().toString(36).substr(2, 9),
  ...result,
  childId: Math.random().toString(36).substr(2, 5),
  childName: params.childName,
  childAge: params.age,
  grade: params.grade,
  subject: params.subject,
  difficulty: params.difficulty,
  createdAt: new Date().toISOString(),
  completed: false
});

export const generateBehaviorInsightAI = async (child: Child, checkIns: DailyCheckIn[]): Promise<ActionPlan> => {
  const dataSummary = checkIns.map(c => `Data: ${c.date}, Humor: ${c.mood}, Sono: ${c.sleepQuality}/5`).join('; ');
  const prompt = `Analise o comportamento de ${child.name} (${child.age} anos) com base nos registros: ${dataSummary}.
  Gere um resumo curto de padrões identificados e um plano de ação de 7 dias com tarefas práticas para os pais.
  Se houver sinais de risco grave, inclua um alerta de segurança. Responda em JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
            alert: { type: Type.STRING, description: "Aviso de segurança se necessário" }
          },
          required: ["summary", "tasks"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (e) {
    return {
      summary: "Continue registrando para que possamos identificar padrões no comportamento.",
      tasks: ["Manter rotina de sono estável", "Incentivar conversa sobre emoções", "Reduzir tempo de tela à noite"]
    };
  }
};

export const generateIllustrationAI = async (prompt: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: `Uma ilustração infantil estilo livro de colorir ou aquarela suave sobre: ${prompt}. Cores alegres, fundo simples.` }] }],
      config: { imageConfig: { aspectRatio: "16:9" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  } catch (e) { console.error(e); }
  return undefined;
};

// Nova função para gerar página de colorir (Line Art)
export const generateColoringPageAI = async (prompt: string): Promise<string | undefined> => {
  try {
    const proAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await proAI.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: `A coloring book page for children, simple black and white line art, thick outlines, no shading, white background. Theme: ${prompt}` }]
      },
      config: {
        imageConfig: { aspectRatio: "3:4", imageSize: "1K" }
      }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  } catch (e) { console.error(e); }
  return undefined;
};

// Nova função para transformar foto em desenho de colorir
export const transformPhotoToColoringAI = async (base64Data: string, mimeType: string): Promise<string | undefined> => {
  try {
    const proAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await proAI.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: "Transform this photo into a simple black and white line art coloring page for children. Thick outlines, no gray areas, purely white and black, cartoon style." }
        ]
      },
      config: {
        imageConfig: { aspectRatio: "3:4", imageSize: "1K" }
      }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  } catch (e) { console.error(e); }
  return undefined;
};

export const generateAudioAI = async (text: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Diga de forma calma e didática: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        }
      }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (e) { console.error(e); }
  return undefined;
};

export const generateParentTipAI = async (child: Child): Promise<string> => {
  const subjectsStr = child.difficultySubjects?.length > 0 ? child.difficultySubjects.join(', ') : 'aprendizado geral';
  const prompt = `Como especialista em pedagogia, dê uma dica curta (máximo 200 caracteres) e prática para um pai ajudar seu filho de ${child.age} anos que tem dificuldade em ${subjectsStr}. Seja encorajador.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || "Incentive a curiosidade hoje!";
  } catch (e) { return "O aprendizado lúdico é o melhor caminho!"; }
};

export const generateExerciseAI = async (params: {
  childName: string;
  age: number;
  grade: string;
  subject: Subject;
  difficulty: Difficulty;
  objective: Objective;
  questionCount: number;
}): Promise<Exercise> => {
  const prompt = `Crie exatamente ${params.questionCount} questões personalizadas para ${params.childName}, ${params.age} anos, ${params.grade}. Matéria: ${params.subject}. Nível: ${params.difficulty}. Responda em JSON.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
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
  });
  return baseParamsToExercise(JSON.parse(response.text), params);
};

export const generateReadingExerciseAI = async (params: {
  childName: string;
  age: number;
  grade: string;
  interest: string;
  difficulty: Difficulty;
  questionCount: number;
}): Promise<Exercise & { imageUrl?: string }> => {
  const prompt = `Crie uma história curta para ${params.childName} sobre ${params.interest}. Nível: ${params.difficulty}. Após a história, inclua exatamente ${params.questionCount} perguntas de interpretação. JSON.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          pedagogicalObjective: { type: Type.STRING },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['multiple'] },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
                explanation: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });
  const parsed = JSON.parse(response.text);
  const imageUrl = await generateIllustrationAI(`${parsed.title} - ${params.interest}`);
  const exercise = baseParamsToExercise(parsed, { ...params, subject: Subject.PORTUGUESE, objective: Objective.REINFORCE });
  return { ...exercise, pedagogicalObjective: `${parsed.content}|||${exercise.pedagogicalObjective}`, imageUrl };
};

export const generateArtsExerciseAI = async (params: {
  childName: string;
  age: number;
  grade: string;
  theme: string;
  materials: string;
  difficulty: Difficulty;
  questionCount: number;
}): Promise<Exercise> => {
  const prompt = `Crie uma missão artística criativa com ${params.questionCount} etapas para ${params.childName}, nível ${params.difficulty}. Tema: ${params.theme}. Materiais: ${params.materials}. JSON.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
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
  });
  const parsed = JSON.parse(response.text);
  const imageUrl = await generateIllustrationAI(`Missão de arte: ${params.theme}`);
  const exercise = baseParamsToExercise(parsed, { ...params, subject: Subject.ART, objective: Objective.REINFORCE });
  return { ...exercise, imageUrl };
};

export const generateEnglishExerciseAI = async (params: {
  childName: string;
  age: number;
  grade: string;
  theme: string;
  difficulty: Difficulty;
  questionCount: number;
}): Promise<Exercise> => {
  const prompt = `Crie exatamente ${params.questionCount} exercícios de inglês lúdicos para ${params.childName}, nível ${params.difficulty}. Tema: ${params.theme}. JSON.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
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
                type: { type: Type.STRING, enum: ['multiple'] },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
                explanation: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });
  return baseParamsToExercise(JSON.parse(response.text), params);
};
