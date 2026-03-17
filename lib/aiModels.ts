export const TEXT_MODEL = "gemini-2.5-flash";

export const IMAGE_MODEL_I2I = (import.meta as any).env.VITE_GEMINI_IMAGE_MODEL_I2I || "gemini-3-pro-image-preview";

export const IMAGE_MODEL_T2I = (import.meta as any).env.VITE_GEMINI_IMAGE_MODEL_T2I || "gemini-3-pro-image-preview";

export const IMAGE_MODEL = IMAGE_MODEL_T2I;

// Log observability once per session
if (typeof window !== 'undefined') {
  console.log("[AI Models] T2I:", IMAGE_MODEL_T2I, "I2I:", IMAGE_MODEL_I2I, "TEXT:", TEXT_MODEL);
}

export const CACHE_TTL_MS = 60 * 60 * 1000;
