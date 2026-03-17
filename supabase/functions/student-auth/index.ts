import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  console.log('[student-auth] Request received');

  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    console.log('[student-auth] OPTIONS preflight');
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase Environment Variables');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Parse Input
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('[student-auth] JSON Parse Error:', e);
      return new Response(JSON.stringify({ error: 'Corpo da requisição inválido.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { accessCode } = body;

    if (!accessCode) {
      return new Response(JSON.stringify({ error: 'Código de acesso obrigatório.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const normalizedCode = accessCode.trim().toUpperCase().replace(/\s/g, '');
    console.log('[student-auth] Validating code:', normalizedCode);

    // 3. Find Student by Access Code
    // We fetch more fields to return to the client for immediate use
    const { data: child, error: childError } = await supabaseAdmin
      .from('children')
      .select('id, guardian_id, game_enabled, story_enabled, drawing_enabled')
      .eq('access_code', normalizedCode)
      .limit(1)
      .maybeSingle();

    if (childError) {
      console.error('[student-auth] DB Fetch Error:', childError);
      throw childError;
    }

    if (!child) {
      console.warn('[student-auth] Invalid code:', normalizedCode);
      return new Response(JSON.stringify({ error: 'INVALID_CODE' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    console.log('[student-auth] Child found:', child.id);

    // 4. Return Success Data (No Auth User Creation)
    // Client will use this to set up local session state
    return new Response(JSON.stringify({ 
      childId: child.id,
      guardianId: child.guardian_id,
      gameEnabled: child.game_enabled,
      storyEnabled: child.story_enabled,
      drawingEnabled: child.drawing_enabled
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const requestId = crypto.randomUUID();
    console.error(`[student-auth] Internal Error (${requestId}):`, error);
    
    return new Response(JSON.stringify({ 
      error: 'Erro interno no servidor de login.', 
      requestId,
      details: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
