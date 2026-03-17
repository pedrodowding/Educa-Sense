
/**
 * Generic retry logic for async operations
 * Useful for handling network flakiness or temporary API failures (net::ERR_ABORTED)
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  backoffFactor: number = 2,
  operationName: string = 'Operation'
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if error is an AbortError or net::ERR_ABORTED related
      const isAbort = error?.name === 'AbortError' || 
                      (error?.message && error.message.includes('aborted')) ||
                      (error?.message && error.message.includes('Failed to fetch')); // Sometimes fetch failure is due to abort

      // Don't retry if it's a 4xx client error (except maybe 429 too many requests or 408 timeout)
      // Supabase errors often have a 'code' or 'status'
      if (error?.status >= 400 && error?.status < 500 && error?.status !== 429 && error?.status !== 408) {
        throw error;
      }
      
      // If it's the last attempt, don't wait
      if (i === maxRetries - 1) break;
      
      // Wait with exponential backoff
      const waitTime = delayMs * Math.pow(backoffFactor, i);
      console.warn(`[Retry] ${operationName} attempt ${i + 1} failed. Retrying in ${waitTime}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  console.error(`[Retry] ${operationName} failed after ${maxRetries} attempts.`);
  throw lastError;
}
