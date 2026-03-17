import { MercadoPagoConfig, Preference } from 'npm:mercadopago';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!token) {
      throw new Error('MERCADO_PAGO_ACCESS_TOKEN not configured');
    }
    
    // Inicializar Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    // Nota: Em algumas configs, SUPABASE_URL pode vir sem o protocolo se não usar a env padrão
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get APP_URL from env
    const APP_URL_RAW = Deno.env.get('APP_URL');
    if (!APP_URL_RAW || !APP_URL_RAW.startsWith('http')) {
      console.error('APP_URL not configured or invalid');
      return new Response(
        JSON.stringify({ error: "APP_URL inválida ou não configurada nas secrets do Supabase." }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Normalize URL (remove trailing slash)
    const APP_URL = APP_URL_RAW.replace(/\/$/, "");

    const client = new MercadoPagoConfig({ accessToken: token });
    
    // Parse request body
    const requestData = await req.json();
    const { plan, userId, email } = requestData;

    console.log('Received payload:', requestData);

    // Define PLANS mapping
    const PLANS: Record<string, { title: string; unit_price: number; quantity: number }> = {
      pro: {
        title: "Educa Sense Pro",
        unit_price: 29.90,
        quantity: 1,
      },
      premium: { // Fallback/Legacy alias
        title: "Educa Sense Pro",
        unit_price: 29.90,
        quantity: 1,
      }
    };

    const selectedPlan = PLANS[plan];

    if (!selectedPlan) {
        return new Response(
         JSON.stringify({ error: `Plano inválido: ${plan}` }),
         { 
           status: 400,
           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
         }
      );
    }

    const preference = new Preference(client);

    // Construct fixed back_urls on backend
    // APP_URL should be the base URL where the app is hosted (e.g. https://educasense.com.br or http://localhost:3002)
    // The hash router paths will be appended to it.
    const back_urls = {
      success: `${APP_URL}/#/assinatura/sucesso`,
      failure: `${APP_URL}/#/assinatura/erro`,
      pending: `${APP_URL}/#/assinatura/pendente`,
    };

    if (!back_urls.success) {
      return new Response(
         JSON.stringify({ error: "Invalid back_urls configuration" }),
         { 
           status: 400,
           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
         }
      );
    }

    // Construct preference object
    const preferenceData = {
      items: [
        {
          id: `plan-${plan}`,
          title: selectedPlan.title,
          quantity: selectedPlan.quantity,
          unit_price: selectedPlan.unit_price,
          currency_id: 'BRL',
        },
      ],
      payer: {
        email: email,
      },
      external_reference: userId,
      back_urls,
      auto_return: 'approved',
      // Explicitly allow PIX and Cards (this is default, but good to be explicit or if we need to exclude others)
      // To FORCE PIX, we don't exclude it. 
      // Mercado Pago Checkout Pro enables all available methods by default unless excluded.
      payment_methods: {
        excluded_payment_methods: [], // Ensure no methods are excluded
        excluded_payment_types: []    // Ensure no types are excluded
      }
    };

    console.log('Creating preference with:', preferenceData);

    const result = await preference.create({ body: preferenceData });

    // Salvar o preference_id no banco para rastreabilidade
    if (result.id && userId && supabaseUrl && supabaseServiceKey) {
        try {
            await supabase.from('profiles').update({
                subscription_preference_id: result.id,
                subscription_updated_at: new Date().toISOString()
            }).eq('id', userId);
        } catch (dbError) {
            console.error('Failed to save preference_id to DB', dbError);
            // Non-blocking error
        }
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, 
      }
    );

  } catch (error) {
    console.error('Error in Edge Function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
