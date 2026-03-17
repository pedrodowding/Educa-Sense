import { PlanTier } from '../config/plans';

export interface BillingProvider {
  createCheckoutSession(userId: string, tier: PlanTier): Promise<{ checkoutUrl: string }>;
  openCustomerPortal(userId: string): Promise<{ portalUrl: string }>;
  verifySession(sessionId: string): Promise<{ tier: PlanTier; status: 'active' | 'inactive' }>;
  getSubscriptionStatus?(userId: string): Promise<{ tier: PlanTier; status: 'active' | 'inactive' }>;
}
