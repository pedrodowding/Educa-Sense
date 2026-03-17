import express from 'express';
import cors from 'cors';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Mercado Pago Configuration
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || 'APP_USR-6778798167944741-122909-eceeff0eb60f565fee651057ab2df3b6-3100517196' 
});

// Google Gen AI Configuration
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// In-memory storage for subscription status (Stub)
// In a real app, use a database (Supabase, Postgres, etc.)
const subscriptionStore = new Map();

// Helper to get user status
const getUserStatus = (userId) => {
  return subscriptionStore.get(userId) || { tier: 'FREE', status: 'inactive' };
};

// Routes

// 1. Create Subscription (PreApproval)
app.post('/api/billing/mp/create-subscription', async (req, res) => {
  const { userId, tier, email } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const preApproval = new PreApproval(client);

    // This is a simplified example. In production, you'd have predefined Plan IDs
    // or create them dynamically. For "subscriptions", we often use PreApproval.
    // Here we create a "preapproval" request which is basically a subscription.
    
    const body = {
      reason: `Assinatura Educa Sense ${tier}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: 29.90,
        currency_id: 'BRL',
      },
      back_url: process.env.FRONTEND_URL || 'http://localhost:5173/#/billing/return', // Frontend return URL
      payer_email: email || 'test_user_123@test.com', // MP requires an email, often
      external_reference: userId, // We store userId here to identify in webhook
      status: 'pending',
    };

    const result = await preApproval.create({ body });

    res.json({ 
      init_point: result.init_point, 
      id: result.id 
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription', details: error.message });
  }
});

// 2. Webhook
app.post('/api/billing/mp/webhook', async (req, res) => {
  const { type, data } = req.body;
  const query = req.query; // MP sends topic/id in query sometimes

  console.log('Webhook received:', JSON.stringify(req.body, null, 2));

  // Handle subscription notifications
  // Note: MP sends different events. For subscriptions, it's often 'subscription_preapproval'
  // or 'preapproval'.
  
  try {
    if (type === 'subscription_preapproval' || query.topic === 'preapproval') {
      const id = data?.id || query.id;
      if (id) {
        // Fetch status from MP to confirm
        const preApproval = new PreApproval(client);
        const subscription = await preApproval.get({ id });
        
        const userId = subscription.external_reference;
        const status = subscription.status; // authorized, paused, cancelled

        if (userId) {
            // Update local store
            // Map MP status to our internal status
            const isActive = status === 'authorized';
            subscriptionStore.set(userId, {
                tier: isActive ? 'PRO' : 'FREE',
                status: isActive ? 'active' : 'inactive',
                mp_status: status,
                last_updated: new Date()
            });
            console.log(`Updated user ${userId} to ${isActive ? 'PRO' : 'FREE'}`);
        }
      }
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

// 3. Get Subscription Status (for frontend polling/check)
app.get('/api/billing/mp/subscription-status/:userId', (req, res) => {
  const { userId } = req.params;
  const status = getUserStatus(userId);
  res.json(status);
});

// 4. AI Content Generation Proxy
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    
    if (!model || !contents) {
      return res.status(400).json({ error: 'Missing required parameters (model, contents)' });
    }

    const response = await ai.models.generateContent({
      model,
      contents,
      config
    });

    res.json(response);
  } catch (error) {
    console.error('AI Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate content', details: error.message });
  }
});

// Export app for Vercel
export default app;

// Only listen if running directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  app.listen(port, () => {
    console.log(`Educa Sense Billing Server running on port ${port}`);
  });
}
