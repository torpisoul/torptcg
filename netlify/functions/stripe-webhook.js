const https = require('https');

exports.handler = async function (event, context) {
    console.log('[STRIPE-WEBHOOK] Function invoked');

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const stripeEvent = JSON.parse(event.body);
        console.log('[STRIPE-WEBHOOK] Event type:', stripeEvent.type);

        // Handle different event types
        switch (stripeEvent.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(stripeEvent.data.object);
                break;

            case 'payment_intent.succeeded':
                await handlePaymentSucceeded(stripeEvent.data.object);
                break;

            default:
                console.log('[STRIPE-WEBHOOK] Unhandled event type:', stripeEvent.type);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ received: true })
        };

    } catch (error) {
        console.error('[STRIPE-WEBHOOK] Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Webhook handler failed', details: error.message })
        };
    }
};

async function handleCheckoutCompleted(session) {
    console.log('[STRIPE-WEBHOOK] Checkout completed:', session.id);

    // Try to get multi-item cart from metadata first
    if (session.metadata?.cart_items) {
        try {
            const cartItems = JSON.parse(session.metadata.cart_items);
            console.log(`[STRIPE-WEBHOOK] Processing multi-item order: ${cartItems.length} items`);

            for (const item of cartItems) {
                // { id: 'p1', q: 2 }
                const productId = item.id;
                const quantity = item.q;

                console.log(`[STRIPE-WEBHOOK] Decreasing stock for ${productId} by ${quantity}`);
                await updateInventoryStock(productId, -quantity);
            }
            console.log('[STRIPE-WEBHOOK] All items processed successfully');
            return;
        } catch (e) {
            console.error('[STRIPE-WEBHOOK] Error parsing cart_items metadata:', e);
            // Fallback to single item logic if parsing fails?
        }
    }

    // Fallback: Extract single product information from metadata (legacy support)
    const productId = session.metadata?.productId;
    const quantity = parseInt(session.metadata?.quantity || '1');

    if (productId) {
        console.log(`[STRIPE-WEBHOOK] Decreasing stock for single item ${productId} by ${quantity}`);
        try {
            // Call inventory function to decrease stock
            await updateInventoryStock(productId, -quantity);
            console.log('[STRIPE-WEBHOOK] Stock updated successfully');
        } catch (error) {
            console.error('[STRIPE-WEBHOOK] Failed to update stock:', error);
        }
    } else {
         console.warn('[STRIPE-WEBHOOK] No product ID or cart_items in metadata');
    }
}

async function handlePaymentSucceeded(paymentIntent) {
    console.log('[STRIPE-WEBHOOK] Payment succeeded:', paymentIntent.id);
    // Additional handling if needed
}

async function updateInventoryStock(productId, delta) {
    console.log(`[STRIPE-WEBHOOK] invoking inventory function locally for ${productId}, delta: ${delta}`);

    try {
        // Import the inventory function handler directly to avoid network calls
        const inventoryFunction = require('./inventory');

        const mockEvent = {
            httpMethod: 'POST',
            body: JSON.stringify({
                productId: productId,
                delta: delta,
                action: 'adjust'
            })
        };

        const mockContext = {}; // Context is usually not strictly needed for this logic

        const response = await inventoryFunction.handler(mockEvent, mockContext);

        if (response.statusCode >= 200 && response.statusCode < 300) {
            console.log(`[STRIPE-WEBHOOK] Inventory update successful: ${response.body}`);
            return JSON.parse(response.body);
        } else {
            throw new Error(`Inventory function returned ${response.statusCode}: ${response.body}`);
        }

    } catch (error) {
        console.error(`[STRIPE-WEBHOOK] Direct inventory call failed:`, error);
        throw error;
    }
}
