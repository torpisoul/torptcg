// netlify/functions/create-checkout-session.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const inventoryFunction = require('./inventory');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { cart } = JSON.parse(event.body);

        if (!cart || cart.length === 0) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Cart is empty' }) };
        }

        // 1. Validate Stock and Price
        // We need to fetch current inventory.
        // Reusing inventory function logic by mocking a request?
        // Or better, we should extract the "read inventory" logic.
        // For now, let's call the inventory endpoint via internal invocation or duplicating logic?
        // Since we are in the same environment, we can require the file if it exports the reading logic.
        // Looking at inventory.js, it seems it interacts with JSONBin.

        // Let's assume we can fetch all products first.
        const mockEvent = { httpMethod: 'GET', queryStringParameters: {} };
        const inventoryResponse = await inventoryFunction.handler(mockEvent, context);

        if (inventoryResponse.statusCode !== 200) {
            throw new Error('Could not fetch inventory for validation');
        }

        const inventoryData = JSON.parse(inventoryResponse.body);
        const products = Array.isArray(inventoryData) ? inventoryData : (inventoryData.products || []);

        const lineItems = [];
        const metadataItems = [];

        for (const cartItem of cart) {
            const product = products.find(p => p.id === cartItem.id);

            if (!product) {
                return { statusCode: 400, body: JSON.stringify({ error: `Product ${cartItem.title} not found` }) };
            }

            if (product.stock < cartItem.quantity) {
                return { statusCode: 400, body: JSON.stringify({ error: `Insufficient stock for ${product.title}` }) };
            }

            // Verify price (security: always use server-side price)
            // Note: Floating point comparison might be tricky, but usually exact matches for prices.
            // cartItem.price comes from client, we ignore it and use product.price

            lineItems.push({
                price_data: {
                    currency: 'gbp',
                    product_data: {
                        name: product.title,
                        images: product.image ? [product.image] : [],
                        metadata: {
                            id: product.id
                        }
                    },
                    unit_amount: Math.round(product.price * 100), // Stripe expects pence
                },
                quantity: cartItem.quantity,
            });

            metadataItems.push({ id: product.id, q: cartItem.quantity });
        }

        // 2. Create Stripe Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${process.env.URL || 'http://localhost:8080'}/success.html`,
            cancel_url: `${process.env.URL || 'http://localhost:8080'}/cancel.html`,
            metadata: {
                // Store simplified cart in metadata for webhook
                // Warning: Metadata has 500 char limit.
                // We'll store a compact JSON string.
                cart_items: JSON.stringify(metadataItems).substring(0, 500)
            }
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ url: session.url })
        };

    } catch (error) {
        console.error('Error creating checkout session:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
