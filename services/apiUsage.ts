import { supabase } from './supabase';

export type ApiUsageEventInput = {
  operation: string;
  model?: string;
  durationMs?: number;
  promptChars?: number;
  responseChars?: number;
  promptTokens?: number;
  responseTokens?: number;
  totalTokens?: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
};

export const recordApiUsageEvent = async (input: ApiUsageEventInput): Promise<void> => {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return;

  const payload = {
    user_id: userId,
    operation: input.operation,
    model: input.model,
    duration_ms: input.durationMs ?? null,
    prompt_chars: input.promptChars ?? null,
    response_chars: input.responseChars ?? null,
    prompt_tokens: input.promptTokens ?? null,
    response_tokens: input.responseTokens ?? null,
    total_tokens: input.totalTokens ?? null,
    success: input.success,
    error_message: input.errorMessage ?? null,
    metadata: input.metadata ?? {}
  };

  await supabase.from('api_usage_events').insert(payload);
};

