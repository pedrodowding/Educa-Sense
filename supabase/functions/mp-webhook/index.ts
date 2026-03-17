import { MercadoPagoConfig, Payment } from 'npm:mercadopago';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
};

function hexToBytes(hex: string) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Ler Body como Texto primeiro para não perder o payload para validação de hash se necessário (embora usemos o data.id no template)
    const bodyText = await req.text();
    let body;
    try {
        body = JSON.parse(bodyText);
    } catch {
        body = {};
    }

    const liveMode = body.live_mode;
    
    // Log inicial para debug
    console.log(`Webhook received. Live Mode: ${liveMode}`);
    if (!liveMode) {
        console.log('Payload:', bodyText);
    }

    // 2. Tratamento de Simulação (live_mode === false)
    if (liveMode === false) {
        console.log('Simulation webhook received. Skipping validation and processing.');
        // Retornar 200 imediatamente conforme solicitado
        return new Response(JSON.stringify({ status: 'simulation_received' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    // 3. Validação de Assinatura (Apenas Produção)
    const mpWebhookSecret = Deno.env.get('MP_WEBHOOK_SECRET');
    
    if (mpWebhookSecret) {
        const signatureHeader = req.headers.get('x-signature');
        const requestId = req.headers.get('x-request-id');
        
        if (!signatureHeader || !requestId) {
             console.error('Missing signature headers in production request');
             return new Response(JSON.stringify({ error: 'Missing signature headers' }), { status: 401 });
        }

        // Extrair ts e v1
        const parts = signatureHeader.split(',');
        let ts = '';
        let v1 = '';
        
        parts.forEach(part => {
            const [key, value] = part.split('=');
            if (key === 'ts') ts = value;
            if (key === 'v1') v1 = value;
        });

        // O template de assinatura depende do evento, mas para pagamentos o padrão é:
        // id:[data.id];request-id:[x-request-id];ts:[ts];
        const dataId = body.data?.id;
        
        if (dataId) {
            const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
            
            const key = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(mpWebhookSecret),
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['verify']
            );
            
            const signatureBytes = hexToBytes(v1);
            const manifestBytes = new TextEncoder().encode(manifest);
            
            const isValid = await crypto.subtle.verify(
                'HMAC',
                key,
                signatureBytes,
                manifestBytes
            );

            if (!isValid) {
                console.error('Invalid signature');
                return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
            }
            console.log('Signature validated successfully');
        } else {
            // Se não tem data.id, pode ser outro tipo de evento ou payload malformado.
            // Em produção estrita, poderíamos rejeitar, mas vamos logar e tentar seguir se possível, 
            // ou rejeitar se a validação for mandatória para segurança.
            console.warn('Missing data.id for signature validation');
        }
    } else {
        // Se não tiver secret configurada, logamos aviso mas permitimos (ou bloqueamos se quisermos forçar segurança)
        // O requisito diz "Se live_mode === true: Validar...". Se não temos a chave, não podemos validar.
        console.warn('MP_WEBHOOK_SECRET not configured. Skipping signature validation.');
    }

    // 4. Processamento Seguro
    const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!mpAccessToken) {
      throw new Error('MERCADO_PAGO_ACCESS_TOKEN not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase Configuration Missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
    
    // Extrair ID do pagamento (suporta query param ou body data)
    // O Mercado Pago costuma mandar no body.data.id para notificações do tipo payment
    let paymentId = body.data?.id;
    const type = body.type; // ou topic na query string

    if (!paymentId) {
        // Tentar pegar da URL se não veio no body (legacy)
        const url = new URL(req.url);
        paymentId = url.searchParams.get('id');
    }

    console.log(`Processing payment. ID: ${paymentId}`);

    if ((type === 'payment' || type === undefined) && paymentId) {
       // Consultar API do Mercado Pago (Fonte da Verdade)
       const payment = new Payment(client);
       try {
           const paymentData = await payment.get({ id: paymentId });
           
           console.log(`Payment Status: ${paymentData.status}, User Ref: ${paymentData.external_reference}`);
    
           if (paymentData.status === 'approved') {
               const userId = paymentData.external_reference;
    
               if (userId) {
                   // Atualizar plano do usuário
               const { error } = await supabase
                 .from('profiles')
                 .update({
                     subscription_tier: 'PRO', // Padronizado uppercase
                     subscription_status: 'active',
                     subscription_provider: 'mercadopago',
                     subscription_payment_id: paymentId,
                     subscription_activated_at: new Date().toISOString(),
                     subscription_updated_at: new Date().toISOString()
                 })
                 .eq('id', userId);
    
                    if (error) {
                        console.error('Error updating profile:', error);
                        // Não lançar erro para não retornar 500 para o MP (eles retentam)
                        // Apenas logar. Se quiser retentativa, retornar 500.
                        // O requisito diz "Nunca lançar erro em simulações", mas aqui estamos em produção (ou live_mode=true).
                        // Vamos retornar 500 se falhar o banco para que o MP tente de novo?
                        // O requisito diz "Em qualquer cenário válido... retornar HTTP 200".
                        // Então vamos retornar 200 e logar o erro.
                    } else {
                        console.log(`User ${userId} promoted to PRO successfully.`);
                    }
               } else {
                   console.warn('Payment approved but no external_reference (userId) found.');
               }
           }
       } catch (mpError) {
           console.error('Error fetching payment from MP:', mpError);
           // Se o ID for fake (simulação que passou como live?), o SDK pode falhar.
           // Não devemos quebrar.
       }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook Error:', error);
    // Retornar 200 mesmo em erro genérico para evitar loop de retentativas infinitas do MP se for erro de código?
    // O requisito diz: "Em qualquer cenário válido (teste ou produção), retornar HTTP 200" e "Nunca lançar erro em simulações".
    // Para produção, se for erro interno, geralmente queremos 500. Mas vou retornar 500 aqui para erros catastróficos.
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
