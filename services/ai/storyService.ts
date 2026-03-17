import { generateContentWithUsage, getSafeText } from "./generateContentWithUsage";

interface StoryParams {
  hero: string;
  theme: string;
  scenario: string;
  challenge: string;
  ending: string;
  childName: string;
}

export const generateStoryAI = async (params: StoryParams): Promise<string | undefined> => {
  const prompt = `
    Escreva uma história infantil curta e mágica (aprox. 150 palavras) para uma criança chamada ${params.childName}.
    
    Elementos obrigatórios:
    - Herói: ${params.hero}
    - Tema: ${params.theme}
    - Cenário: ${params.scenario}
    - Desafio: ${params.challenge}
    - Final: ${params.ending}

    Estilo:
    - Linguagem simples, divertida e educativa.
    - Use emojis no texto.
    - Divida em 3 ou 4 parágrafos curtos.
    - Sem violência ou medo.
    
    Apenas o texto da história, sem títulos ou introduções.
  `;

  try {
    const result = await generateContentWithUsage({
      operation: 'generate_story_day',
      request: {
        model: 'gemini-2.5-flash', // Fast model for text
        contents: [{ parts: [{ text: prompt }] }]
      }
    });
    return getSafeText(result);
  } catch (e) {
    console.error("Story generation failed", e);
    return undefined;
  }
};