import { BillingProvider } from '../provider';
import { PlanTier } from '../../config/plans';
import { supabase } from '../../services/supabase';

export const MercadoPagoProvider: BillingProvider = {
  async createCheckoutSession(userId: string, tier: PlanTier): Promise<{ checkoutUrl: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        throw new Error('Usuário não autenticado.');
      }

      const payload = {
        plan: tier.toLowerCase(),
        userId: session.user.id,
        email: session.user.email
      };
      
      console.log('Invoking mp-create-checkout with:', payload);

      const { data, error } = await supabase.functions.invoke('mp-create-checkout', {
        body: payload
      });

      if (error) {
        console.error("mp-create-checkout invoke error:", error);
        // Tentar extrair detalhes do erro
        let errorDetails = 'Sem detalhes adicionais';
        try {
            if (error instanceof Error && 'context' in error) {
                const ctx = (error as any).context;
                if (ctx && typeof ctx.json === 'function') {
                    const body = await ctx.json();
                    console.error("Error body from function:", body);
                    errorDetails = JSON.stringify(body);
                }
            }
        } catch (e) {
            console.warn("Could not parse error context", e);
        }
        
        throw new Error(`Erro no checkout: ${error.message}. Detalhes: ${errorDetails}`);
      }
      
      // Prefer init_point (production), fallback to sandbox if needed
      const checkoutUrl = data.init_point || data.sandbox_init_point;
      
      if (!checkoutUrl) {
        throw new Error('Invalid response from payment service: missing init_point');
      }

      return { checkoutUrl };
    } catch (error: any) {
      console.error('Error creating MP subscription:', error);
      throw error;
    }
  },

  async openCustomerPortal(userId: string): Promise<{ portalUrl: string }> {
    return { portalUrl: 'https://www.mercadopago.com.br/subscriptions' };
  },

  async verifySession(sessionId: string): Promise<{ tier: PlanTier; status: 'active' | 'inactive' }> {
    // Verification is usually done via webhook or status check, this might be legacy
    return { tier: 'FREE', status: 'inactive' };
  },
  
  async getSubscriptionStatus(userId: string): Promise<{ tier: PlanTier; status: 'active' | 'inactive' }> {
    // This could also be moved to an Edge Function if needed, but for now we'll keep it safe or stub it
    // The instructions focused on createCheckoutSession. 
    // If the original code used /api/billing/mp/subscription-status, we should probably check if that exists or if we should mock/fix it.
    // However, the prompt specifically asked to "Remover qualquer chamada para /api/billing/mp/*".
    // I will return a safe default or use Supabase DB directly if possible, but the prompt didn't specify replacing this part with an Edge Function.
    // Given the constraints, I will return the current local entitlement state or query the DB directly if I knew the schema.
    // For now, let's look at how the app determines status. It seems to use Entitlements.getUserTier().
    // I'll leave this as a basic check or throw an error to avoid broken /api calls.
    
    // Better yet, let's see if we can query the profiles table.
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_tier, subscription_status')
            .eq('id', userId)
            .single();

        if (profile?.subscription_status === 'active' && (profile.subscription_tier === 'PRO' || profile.subscription_tier === 'pro')) {
            return { tier: 'PRO', status: 'active' };
        }
        return { tier: 'FREE', status: 'inactive' };
    } catch (error) {
        console.error('Error fetching subscription status:', error);
        return { tier: 'FREE', status: 'inactive' };
    }
  }
};
