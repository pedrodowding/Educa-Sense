import { recordApiUsageEvent } from '../apiUsage';
import { retryOperation } from '../retry';

const estimateChars = (contents: unknown): number | undefined => {
  if (typeof contents === 'string') return contents.length;
  try {
    return JSON.stringify(contents).length;
  } catch {
    return undefined;
  }
};

export const generateContentWithUsage = async (input: {
  operation: string;
  request: any;
}): Promise<any> => {
  const startedAt = Date.now();
  const promptChars = estimateChars(input.request?.contents);

  try {
    const response = await retryOperation(async () => {
      // Use direct fetch instead of supabase.functions.invoke to bypass auth issues
      // Since the function is public (no JWT enforcement), this is safe and more reliable
      const functionUrl = `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/ai-generate`;
      
      const res = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${(import.meta as any).env.VITE_SUPABASE_ANON_KEY}` // Optional for public functions
        },
        body: JSON.stringify(input.request)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Edge Function failed: ${res.status} ${res.statusText} - ${errorText}`);
      }

      const data = await res.json();
      
      // Log for debug
      // console.log("[Edge] Response data keys:", Object.keys(data));
      
      // Adaptador para o formato esperado pelo cliente
      // A Edge Function retorna { text: string, usageMetadata: ... }
      // O cliente espera um objeto com .response.text() ou .text()
      const extractedText = getSafeText(data);
      return {
        ...data,
        text: () => extractedText,
        candidates: data?.candidates ?? data?.response?.candidates,
        response: data?.response ?? {
          text: () => extractedText,
          candidates: data?.candidates,
          usageMetadata: data?.usageMetadata
        },
        usageMetadata: data?.usageMetadata ?? data?.response?.usageMetadata
      };
    }, 3, 1000, 2, `AI:${input.operation}`);
    
    const durationMs = Date.now() - startedAt;

    const responseText = getSafeText(response);

    try {
      await recordApiUsageEvent({
        operation: input.operation,
        model: input.request?.model,
        durationMs,
        promptChars,
        responseChars: responseText.length,
        promptTokens: response?.usageMetadata?.promptTokenCount,
        responseTokens: response?.usageMetadata?.candidatesTokenCount,
        totalTokens: response?.usageMetadata?.totalTokenCount,
        success: true
      });
    } catch (telemetryError) {
      console.warn('[AI Usage] Telemetria não crítica falhou:', telemetryError);
    }

    return response;
  } catch (e: any) {
    const durationMs = Date.now() - startedAt;
    try {
      await recordApiUsageEvent({
        operation: input.operation,
        model: input.request?.model,
        durationMs,
        promptChars,
        success: false,
        errorMessage: e?.message ? String(e.message) : 'Erro desconhecido'
      });
    } catch (telemetryError) {
      console.warn('[AI Usage] Telemetria de erro falhou:', telemetryError);
    }
    throw e;
  }
};

export const getSafeText = (res: any): string => {
    try {
        if (!res) return '';
        
        // 1. Standard SDK Accessors
        if (typeof res.text === 'function') return res.text();
        if (typeof res.text === 'string') return res.text;
        if (res.response && typeof res.response.text === 'function') return res.response.text();

        // 2. Raw JSON Structure (Serialized)
        if (res.candidates && Array.isArray(res.candidates) && res.candidates.length > 0) {
            const candidate = res.candidates[0];
            // Check content.parts array
            if (candidate.content?.parts?.[0]?.text) {
                return candidate.content.parts[0].text;
            }
            // Sometimes it might be directly in content (rare)
            if (typeof candidate.content === 'string') return candidate.content;
        }

        // 3. Fallback: Recursive search or stringify check (Last resort)
        // If we have a 'text' property anywhere in the first few levels
        if (res.text && typeof res.text === 'string') return res.text;
        
        console.warn("[getSafeText] Failed to extract text. Structure:", Object.keys(res));
        if (res.candidates) console.warn("[getSafeText] Candidates[0] keys:", Object.keys(res.candidates[0] || {}));
        
        return '';
    } catch (e) {
        console.error("[getSafeText] Exception:", e);
        return '';
    }
};
