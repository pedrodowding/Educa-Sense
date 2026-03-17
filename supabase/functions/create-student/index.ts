import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Validar Token do Usuário
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // 2. Consultar Tier e Contagem Atual
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    const { count, error: countError } = await supabase
      .from('children')
      .select('*', { count: 'exact', head: true })
      .eq('guardian_id', user.id);

    if (countError) throw countError;

    // 3. Validar Limite (Regra: Free permite apenas 1)
    const tier = profile.subscription_tier?.toUpperCase() || 'FREE';
    const currentCount = count || 0;

    if (tier === 'FREE' && currentCount >= 1) {
      return new Response(
        JSON.stringify({ 
          error: "LIMIT_REACHED", 
          message: "Plano Free permite apenas 1 estudante. Faça upgrade para adicionar mais." 
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
        }
      );
    }

    // 4. Criar Estudante
    const studentData = await req.json();
    
    // Gerar access_code se não enviado
    if (!studentData.access_code) {
        studentData.access_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    const { data: newStudent, error: insertError } = await supabase
      .from('children')
      .insert({
        ...studentData,
        guardian_id: user.id,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify(newStudent), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });

  } catch (error) {
    console.error('Error creating student:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
