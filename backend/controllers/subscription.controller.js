// controllers/subscriptionController.js
const { query, withTransaction } = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../config/logger');

const subscriptionController = {
  // Create Stripe checkout session
  createCheckoutSession: async (req, res) => {
    try {
      const { planType } = req.body; // 'monthly' or 'lifetime'
      const userId = req.user.id;

      // Get user email
      const userResult = await query(
        'SELECT email FROM users WHERE id = $1',
        [userId]
      );
      const userEmail = userResult.rows[0].email;

      // Determine price ID based on plan
      const priceId = planType === 'monthly' 
        ? process.env.STRIPE_MONTHLY_PRICE_ID 
        : process.env.STRIPE_LIFETIME_PRICE_ID;

      // Create or retrieve Stripe customer
      let stripeCustomerId;
      const existingCustomer = await query(
        'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1',
        [userId]
      );

      if (existingCustomer.rows.length > 0 && existingCustomer.rows[0].stripe_customer_id) {
        stripeCustomerId = existingCustomer.rows[0].stripe_customer_id;
      } else {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: { userId }
        });
        stripeCustomerId = customer.id;
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1
        }],
        mode: planType === 'monthly' ? 'subscription' : 'payment',
        success_url: `${process.env.FRONTEND_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/pricing`,
        metadata: {
          userId,
          planType
        }
      });

      res.json({
        success: true,
        checkoutUrl: session.url
      });

    } catch (error) {
      logger.error('Create checkout session error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create checkout session'
      });
    }
  },

  // Handle Stripe webhook
  handleWebhook: async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      logger.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutComplete(event.data.object);
          break;
        case 'customer.subscription.updated':
          await handleSubscriptionUpdate(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionCancelled(event.data.object);
          break;
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  },

  // Check user's subscription status
  checkSubscription: async (req, res) => {
    try {
      const userId = req.user.id;

      const result = await query(`
        SELECT 
          s.*,
          u.email,
          array_agg(
            json_build_object(
              'id', bt.id,
              'name', bt.name,
              'slug', bt.slug
            )
          ) as user_bots
        FROM subscriptions s
        JOIN users u ON u.id = s.user_id
        LEFT JOIN user_bots ub ON ub.user_id = s.user_id
        LEFT JOIN bot_templates bt ON bt.id = ub.bot_template_id
        WHERE s.user_id = $1 AND s.status = 'active'
        GROUP BY s.id, u.email
      `, [userId]);

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          hasSubscription: false
        });
      }

      res.json({
        success: true,
        hasSubscription: true,
        subscription: result.rows[0]
      });

    } catch (error) {
      logger.error('Check subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check subscription'
      });
    }
  }
};

// Helper functions
async function handleCheckoutComplete(session) {
  const userId = session.metadata.userId;
  const planType = session.metadata.planType;

  await withTransaction(async (client) => {
    // Create or update subscription record
    await client.query(`
      INSERT INTO subscriptions (
        user_id, 
        stripe_customer_id, 
        stripe_subscription_id,
        plan_type, 
        status,
        current_period_start,
        current_period_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) 
      DO UPDATE SET
        stripe_customer_id = $2,
        stripe_subscription_id = $3,
        plan_type = $4,
        status = $5,
        current_period_start = $6,
        current_period_end = $7,
        updated_at = CURRENT_TIMESTAMP
    `, [
      userId,
      session.customer,
      session.subscription,
      planType,
      'active',
      planType === 'monthly' ? new Date() : null,
      planType === 'monthly' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
    ]);

    // Give user access to starter bots
    const starterBots = await client.query(
      'SELECT id FROM bot_templates WHERE slug IN ($1, $2, $3)',
      ['cody-copywriter', 'marty-marketing', 'bizzy-business']
    );

    for (const bot of starterBots.rows) {
      await client.query(`
        INSERT INTO user_bots (user_id, bot_template_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, bot_template_id) DO NOTHING
      `, [userId, bot.id]);
    }
  });
}

async function handleSubscriptionUpdate(subscription) {
  await query(`
    UPDATE subscriptions
    SET 
      status = $2,
      current_period_end = $3,
      updated_at = CURRENT_TIMESTAMP
    WHERE stripe_subscription_id = $1
  `, [
    subscription.id,
    subscription.status,
    new Date(subscription.current_period_end * 1000)
  ]);
}

async function handleSubscriptionCancelled(subscription) {
  await query(`
    UPDATE subscriptions
    SET 
      status = 'cancelled',
      updated_at = CURRENT_TIMESTAMP
    WHERE stripe_subscription_id = $1
  `, [subscription.id]);
}

module.exports = subscriptionController;