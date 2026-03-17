import { IMAGE_MODEL_T2I, IMAGE_MODEL_I2I } from "../../lib/aiModels";
import { processImageToLineArt, validateColoringPagePattern } from '../imageProcessing';
import { generateContentWithUsage, getSafeText } from "./generateContentWithUsage";

// PROMPT MESTRE OTIMIZADO (Vector Simplification)
// Focado em criar imagens que realmente parecem páginas de colorir:
// - Linhas grossas e contínuas (stencil/vector style)
// - Fundo 100% branco
// - Sem sombras, sem escalas de cinza, sem texturas
const PROMPT_STANDARD = `
children's coloring book page, pure black and white line art,
thick continuous outlines, no shading, no gray, no gradients,
white background, vector style, stencil style,
large empty areas for coloring, simple shapes,
cute and friendly style, centered composition.
Theme:
`;


const PROMPT_FALLBACK = `
simple coloring page, black and white only, thick lines, no shading, white background, clean vector art. Theme:
`;

export type ColoringStyle = 'classic' | 'cute' | 'cartoon' | 'minimal';

const STYLE_PROMPTS: Record<ColoringStyle, string> = {
  classic: "classic children's coloring book line art, thick continuous outlines, pure black and white, no shading, no gray, white background, large empty areas",
  cute: "cute rounded characters, friendly expressions, kawaii vibe, simple shapes, thick outlines, pure black and white, no shading, white background, large empty areas",
  cartoon: "fun expressive cartoon style, dynamic poses, playful proportions, thick outlines, pure black and white, no shading, white background, large empty areas",
  minimal: "minimalist line art, very simple shapes, few details, thick outlines, pure black and white, no shading, white background, very large empty areas"
};

const logObservability = (action: string, model: string, durationMs: number, status: string, details?: any) => {
  console.log(`[OBSERVABILITY] ${action} | Model: ${model} | Time: ${durationMs}ms | Status: ${status}`, details || '');
};

// In-memory cache for generated images to avoid redundant API calls
const imageCache = new Map<string, string>();

const getCacheKey = (prompt: string, model: string): string => {
  return `${model}:${prompt.trim().toLowerCase()}`;
};

const generateSVGColoringPage = async (prompt: string): Promise<string | undefined> => {
  const model = "gemini-2.0-flash-exp"; // Mantendo SVG com modelo experimental por enquanto, ou mudar para flash se suportar
  const startTime = Date.now();
  console.log(`[AI Coloring] Attempting SVG generation with ${model}...`);
  try {
    const svgPrompt = `
      You are an expert SVG artist. Create a simple, cute, black and white coloring page for a child.
      Subject: ${prompt}
      Style: Thick black outlines, white background, simple shapes, no shading, minimal details.
      
      IMPORTANT: Return ONLY the raw SVG code. Start with <svg and end with </svg>. 
      Do NOT use markdown code blocks. 
      Ensure the SVG has a viewBox="0 0 512 512" and uses black strokes (stroke="black" stroke-width="2") and white fill (fill="white").
    `;

    const result = await generateContentWithUsage({
      operation: 'generate_coloring_svg',
      request: {
        model: model,
        contents: { parts: [{ text: svgPrompt }] }
      }
    });

    let svgCode = getSafeText(result);
    svgCode = svgCode.replace(/```xml/g, '').replace(/```svg/g, '').replace(/```/g, '').trim();
    const startIndex = svgCode.indexOf('<svg');
    const endIndex = svgCode.lastIndexOf('</svg>');
    
    if (startIndex !== -1 && endIndex !== -1) {
      svgCode = svgCode.substring(startIndex, endIndex + 6);
      const base64Svg = btoa(unescape(encodeURIComponent(svgCode)));
      logObservability('GenerateSVG', model, Date.now() - startTime, 'SUCCESS');
      return `data:image/svg+xml;base64,${base64Svg}`;
    }
  } catch (e) {
    logObservability('GenerateSVG', model, Date.now() - startTime, 'ERROR', e);
  }
  return undefined;
};

export const generateColoringImage = async (prompt: string, style: ColoringStyle = 'classic'): Promise<string | undefined> => {
  const startTime = Date.now();
  const primaryModel = IMAGE_MODEL_T2I;
  const modelsToTry = [primaryModel, "gemini-3-pro-image-preview", "gemini-2.0-flash-exp"];
  
  console.log(`[AI Coloring] style: ${style}, model: ${primaryModel}`);

  // Check cache first
  const cacheKey = getCacheKey(`${prompt}:${style}`, primaryModel);
  if (imageCache.has(cacheKey)) {
    console.log(`[AI Coloring] Returning cached image for prompt: "${prompt}"`);
    logObservability('GenerateColoring', 'CACHE', 0, 'SUCCESS_CACHE');
    return imageCache.get(cacheKey);
  }

  const attemptGenerate = async (p: string, isFallback = false): Promise<string | undefined> => {
    // Encapsula o prompt do usuário com a estrutura rígida de engenharia de prompt
    // Se for fallback, usa o PROMPT_FALLBACK simples.
    // Se não, usa o STYLE_PROMPTS selecionado (ou classic por padrão)
    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS['classic'];
    const basePrompt = isFallback ? PROMPT_FALLBACK : stylePrompt;
    
    const fullPrompt = `${basePrompt}. Theme: ${p}`;

    try {
      for (const model of modelsToTry) {
        try {
          console.log(`[AI Coloring] Generating (T2I) with ${model}. Fallback? ${isFallback}`);
          const response = await generateContentWithUsage({
            operation: isFallback ? 'generate_coloring_image_fallback' : 'generate_coloring_image',
            request: {
              model,
              contents: { parts: [{ text: fullPrompt }] },
              config: { responseModalities: ['IMAGE'] }
            }
          });

          for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              const dataUrl = `data:image/png;base64,${part.inlineData.data}`;
              const validation = await validateColoringPagePattern(dataUrl);
              if (validation.isValid) {
                // Cache the successful result
                imageCache.set(cacheKey, dataUrl);
                return dataUrl;
              } else {
                console.warn(`[AI Coloring] Validation failed: ${validation.reason}`);
                if (!isFallback) return undefined;
                return undefined;
              }
            }
          }
        } catch (modelError: any) {
          const msg = modelError?.message ? String(modelError.message) : "";
          const isRetryableModelIssue = msg.includes("404") || msg.includes("NOT_FOUND") || msg.includes("not supported");
          if (!isRetryableModelIssue) throw modelError;
        }
      }
    } catch (e) {
      console.error(`[AI Coloring] T2I Generation failed:`, e);
    }
    return undefined;
  };

  let result = await attemptGenerate(prompt, false);
  
  if (!result) {
    console.log(`[AI Coloring] First attempt failed or invalid. Retrying with fallback prompt...`);
    result = await attemptGenerate(prompt, true);
    if (result) {
        logObservability('GenerateColoring', primaryModel, Date.now() - startTime, 'SUCCESS_WITH_RETRY');
        return result;
    }
  } else {
      logObservability('GenerateColoring', primaryModel, Date.now() - startTime, 'SUCCESS');
      return result;
  }

  // Se falhar T2I, tenta SVG como último recurso
  return await generateSVGColoringPage(prompt);
};

export const transformPhotoToColoring = async (base64Data: string, mimeType: string, style: ColoringStyle = 'classic'): Promise<string | undefined> => {
  const startTime = Date.now();
  // USANDO O MODELO DE IMAGEM DEFINIDO EM ENV
  const visionModel = IMAGE_MODEL_I2I; 
  
  // Check cache for this image (using a simple hash of first 100 chars + length as key proxy)
  const imageHash = `${base64Data.substring(0, 100)}_${base64Data.length}`;
  const cacheKey = `transform:${visionModel}:${imageHash}:${style}`;
  
  if (imageCache.has(cacheKey)) {
    console.log(`[AI Coloring] Returning cached transformation for image`);
    logObservability('TransformPhoto', 'CACHE', 0, 'SUCCESS_CACHE');
    return imageCache.get(cacheKey);
  }

  console.log(`[AI Coloring] Transforming photo (Direct I2I flow) with ${visionModel} and style ${style}...`);

  const styleDesc = STYLE_PROMPTS[style] || STYLE_PROMPTS['classic'];

  const MAGIC_PROMPT = `
Transform this photo into a simple black and white line art coloring page for children. 
Style Requirements: ${styleDesc}
Keep the main subject clear and recognizable.
Thick outlines, no gray areas, purely white and black.
Stencil, Vector style, High contrast, Clear edges.
  `;

  try {
    const result = await generateContentWithUsage({
      operation: 'transform_photo_to_coloring',
      request: {
        model: visionModel,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: base64Data, mimeType: mimeType } },
              { text: MAGIC_PROMPT }
            ]
          }
        ]
      }
    });

    for (const part of result.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            const dataUrl = `data:image/png;base64,${part.inlineData.data}`;
            logObservability('TransformPhoto', visionModel, Date.now() - startTime, 'SUCCESS_I2I');
            imageCache.set(cacheKey, dataUrl);
            return dataUrl;
        }
    }

    console.warn("[AI Coloring] Model returned text instead of image:", result.text);
    throw new Error("Model did not return an image");

  } catch (aiError) {
    console.error("[AI Coloring] AI I2I Pipeline failed:", aiError);
    logObservability('TransformPhoto', visionModel, Date.now() - startTime, 'FAIL_AI', aiError);

    try {
      console.log(`[AI Coloring] Falling back to local processing...`);
      const dataUrl = `data:${mimeType};base64,${base64Data}`;
      const localResult = await processImageToLineArt(dataUrl);
      logObservability('TransformPhoto', 'LOCAL_ALGO', Date.now() - startTime, 'SUCCESS_FALLBACK_LOCAL');
      return localResult;
    } catch (localError) {
      console.error("[AI Coloring] Local fallback failed:", localError);
    }
  }
  
  return undefined;
};

export const generateIllustration = async (prompt: string, style: ColoringStyle = 'classic'): Promise<string | undefined> => {
   return generateColoringImage(prompt, style);
};

export interface BringToLifeResult {
  url?: string;
  story?: string;
  mode: 'image' | 'story_only';
  error?: {
    code: string;
    message: string;
    canRetry: boolean;
  };
}

export const bringDrawingToLife = async (base64Data: string, mimeType: string, isPro: boolean = false): Promise<BringToLifeResult> => {
  const startTime = Date.now();
  
  // LOG START
  console.group(`[BringToLife] Execution Started at ${new Date().toISOString()}`);
  console.log(`[Input] Mime: ${mimeType}, Base64 Length: ${base64Data.length}, IsPro: ${isPro}`);

  // MODELS CONFIGURATION
  const PRIMARY_MODEL = "gemini-3-pro-image-preview"; // Best for images
  const FALLBACK_MODEL = "gemini-2.5-flash-image-preview"; // Faster/Cheaper fallback
  const STORY_MODEL = "gemini-2.0-flash-exp"; // For story fallback
  
  const complexityPrompt = isPro 
    ? "high-quality 3D digital character, vibrant, detailed, expressive, Pixar-style lighting and textures"
    : "simple flat digital character, colorful but simple, clean lines, basic shading";

  const MAGIC_PROMPT = `
Transform this child's drawing into a friendly digital character. 
Preserve the original idea and shapes. 
Make it ${complexityPrompt}.
No scary elements. Style: clean, playful, expressive.
IMPORTANT: Return a single image. No text in the image. Clean background.
  `;

  // Simple cache key (versioned by prompt/model)
  const imageHash = `${base64Data.substring(0, 100)}_${base64Data.length}`;
  const cacheKey = `life:v2:${imageHash}:${isPro}`;

  if (imageCache.has(cacheKey)) {
    console.log(`[Cache] Hit found for key: ${cacheKey}`);
    console.groupEnd();
    return { url: imageCache.get(cacheKey), mode: 'image' };
  }
  console.log(`[Cache] Miss. Proceeding to API call.`);

  // Helper to try generation
  const attemptGeneration = async (model: string, isFallback: boolean): Promise<string | null> => {
    try {
      console.log(`[API] Attempting generation with ${model} (Fallback: ${isFallback})`);
      const result = await generateContentWithUsage({
        operation: 'bring_drawing_to_life',
        request: {
          model: model,
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { data: base64Data, mimeType: mimeType } },
                { text: MAGIC_PROMPT }
              ]
            }
          ],
          config: {
             responseModalities: ['IMAGE']
          }
        }
      });

      // Flexible Parser: Check all candidates and parts for inlineData
      if (result.candidates && result.candidates.length > 0) {
        for (const candidate of result.candidates) {
          if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
               if (part.inlineData && part.inlineData.data) {
                 const mime = part.inlineData.mimeType || 'image/png';
                 const dataUrl = `data:${mime};base64,${part.inlineData.data}`;
                 console.log(`[Success] Image found in response from ${model}.`);
                 return dataUrl;
               }
            }
          }
        }
      }
      
      console.warn(`[API] No image data found in response from ${model}.`);
      return null;
    } catch (e: any) {
      console.warn(`[API] Error with ${model}:`, e.message);
      return null;
    }
  };

  // 1. Try Primary Model
  let imageUrl = await attemptGeneration(PRIMARY_MODEL, false);

  // 2. Try Fallback Model if needed
  if (!imageUrl) {
    console.log(`[Flow] Primary failed. Trying fallback model: ${FALLBACK_MODEL}`);
    imageUrl = await attemptGeneration(FALLBACK_MODEL, true);
  }

  // 3. Success? Cache and Return
  if (imageUrl) {
    imageCache.set(cacheKey, imageUrl);
    logObservability('BringToLife', 'combined', Date.now() - startTime, 'SUCCESS_IMAGE');
    console.log(`[Result] Success Image.`);
    console.groupEnd();
    return { url: imageUrl, mode: 'image' };
  }

  // 4. Fatal Failure -> Story Mode Fallback
  console.log(`[Flow] All image generation attempts failed. Falling back to Story Mode.`);
  
  try {
    const STORY_PROMPT = `
      Olhe para este desenho feito por uma criança.
      Crie uma mini história mágica (max 3 frases) sobre o personagem ou cena do desenho.
      Comece com "Era uma vez...".
      Seja criativo, doce e encorajador.
      Use emojis.
    `;
    
    const storyResult = await generateContentWithUsage({
      operation: 'bring_drawing_story_fallback',
      request: {
        model: STORY_MODEL,
        contents: [
          {
            role: "user",
            parts: [
               { inlineData: { data: base64Data, mimeType: mimeType } },
               { text: STORY_PROMPT }
            ]
          }
        ]
      }
    });
    
    const storyText = storyResult.text || "Seu desenho é muito especial e mágico! ✨";
    
    logObservability('BringToLife', 'story_fallback', Date.now() - startTime, 'SUCCESS_STORY_ONLY');
    console.log(`[Result] Success Story Only.`);
    console.groupEnd();
    
    return {
      story: storyText,
      mode: 'story_only'
    };

  } catch (storyError) {
    console.error(`[Error] Even story fallback failed.`, storyError);
    logObservability('BringToLife', 'all', Date.now() - startTime, 'FAIL_TOTAL');
    console.groupEnd();
    
    return {
       mode: 'image', // Technical fallback to show error
       error: {
         code: 'AI_TOTAL_FAIL',
         message: 'Não conseguimos processar o desenho agora. Tente novamente mais tarde.',
         canRetry: true
       }
    };
  }
};
