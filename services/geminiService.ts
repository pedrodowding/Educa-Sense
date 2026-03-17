import { generateContentWithUsage } from "./ai/generateContentWithUsage";

export { 
  generateExercise as generateExerciseAI, 
  generateReadingExercise as generateReadingExerciseAI, 
  generateArtsExercise as generateArtsExerciseAI, 
  generateEnglishExercise as generateEnglishExerciseAI,
  verifyAnswer as verifyAnswerAI
} from './ai/exerciseService';

export { 
  generateInsights as generateBehaviorInsightAI, 
  generateParentTip as generateParentTipAI 
} from './ai/insightService';

export { 
  generateColoringImage as generateColoringPageAI, 
  transformPhotoToColoring as transformPhotoToColoringAI, 
  generateIllustration as generateIllustrationAI,
  bringDrawingToLife as bringDrawingToLifeAI,
  type ColoringStyle,
  type BringToLifeResult
} from './ai/coloringService';

export { generateStoryAI } from './ai/storyService';

export const generateAudioAI = async (text: string): Promise<string | undefined> => {
  try {
    const response = await generateContentWithUsage({
      operation: 'generate_audio_tts',
      request: {
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Diga de forma calma e didática: ${text}` }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          }
        }
      }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (e) { console.error(e); }
  return undefined;
};
