
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const setChildAccessCodeHeader = (code: string | null) => {
  if (code) {
    // @ts-ignore
    // supabase.rest.headers['x-child-access-code'] = code; // DISABLED: Causing CORS issues on Safari/Prod
  } else {
    // @ts-ignore
    // delete supabase.rest.headers['x-child-access-code'];
  }
};
