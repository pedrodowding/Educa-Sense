import { BillingProvider } from '../provider';
import { PlanTier } from '../../config/plans';

export const MockBillingProvider: BillingProvider = {
  async createCheckoutSession(userId: string, tier: PlanTier): Promise<{ checkoutUrl: string }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real app, this would call the backend to get a Stripe/MercadoPago URL.
    // Here we return a local route that simulates the "success" return from the payment provider.
    // We append a fake session_id.
    const mockSessionId = `mock_session_${Date.now()}`;
    const returnUrl = `${window.location.origin}/#/billing/return?session_id=${mockSessionId}&tier=${tier}`;
    
    return { checkoutUrl: returnUrl };
  },

  async openCustomerPortal(userId: string): Promise<{ portalUrl: string }> {
    await new Promise(resolve => setTimeout(resolve, 800));
    // Redirect back to subscription page for now
    return { portalUrl: `${window.location.origin}/#/assinatura` };
  },

  async verifySession(sessionId: string): Promise<{ tier: PlanTier; status: 'active' | 'inactive' }> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In dev mode/mock, we always approve.
    return { 
      tier: 'PRO', 
      status: 'active' 
    };
  },

  async getSubscriptionStatus(userId: string): Promise<{ tier: PlanTier; status: 'active' | 'inactive' }> {
    return { tier: 'FREE', status: 'inactive' };
  }
};
