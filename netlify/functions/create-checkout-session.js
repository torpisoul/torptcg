// netlify/functions/create-checkout-session.js
const inventoryFunction = require('./inventory');
const Stripe = require('stripe');

// Cache the initialized stripe instance
let stripeInstance = null;

exports.handler = async function (event, context) {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Lazy initialize Stripe inside handler to ensure env vars are available
    // But use cached instance if already initialized
    if (!stripeInstance) {
        const stripeKey = process.env.TEST_STRIPE_SECRET_KEY ||
            process.env.PROD_STRIPE_SECRET_KEY ||
            process.env.STRIPE_SECRET_KEY;

        if (!stripeKey) {
            const availableKeys = Object.keys(process.env).filter(k => k.includes('STRIPE')).sort();
            console.error('No Stripe secret key found. Available STRIPE keys:', availableKeys);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'Payment system configuration error',
                    details: 'No Stripe secret key found. Expected TEST_STRIPE_SECRET_KEY, PROD_STRIPE_SECRET_KEY, or STRIPE_SECRET_KEY.',
                    debug: { stripeKeys: availableKeys }
                })
            };
        }

        try {
            stripeInstance = new Stripe(stripeKey);
            console.log('✅ Stripe initialized successfully');
        } catch (err) {
            console.error('Failed to initialize Stripe:', err.message);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'Payment system configuration error',
                    details: `Failed to initialize Stripe: ${err.message}`
                })
            };
        }
    }

    const stripe = stripeInstance;

    try {
        const { cart } = JSON.parse(event.body);

        if (!cart || cart.length === 0) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Cart is empty' }) };
        }

        // 1. Validate Stock and Price
        const mockEvent = { httpMethod: 'GET', queryStringParameters: {} };
        const inventoryResponse = await inventoryFunction.handler(mockEvent, context);

        if (inventoryResponse.statusCode !== 200) {
            console.error('Inventory fetch failed:', inventoryResponse.body);
            throw new Error(`Could not fetch inventory for validation: ${inventoryResponse.statusCode}`);
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

        // Calculate order total for shipping threshold
        const orderTotal = lineItems.reduce((sum, item) => {
            return sum + (item.price_data.unit_amount * item.quantity);
        }, 0) / 100; // Convert from pence to pounds

        // Shipping: £2.99 for orders under £20, free for £20+
        const FREE_SHIPPING_THRESHOLD = 20;
        const SHIPPING_COST_PENCE = 299; // £2.99

        const shippingOptions = orderTotal >= FREE_SHIPPING_THRESHOLD
            ? [{
                shipping_rate_data: {
                    type: 'fixed_amount',
                    fixed_amount: { amount: 0, currency: 'gbp' },
                    display_name: 'Free UK Mainland Shipping',
                    delivery_estimate: {
                        minimum: { unit: 'business_day', value: 1 },
                        maximum: { unit: 'business_day', value: 3 }
                    }
                }
            }]
            : [{
                shipping_rate_data: {
                    type: 'fixed_amount',
                    fixed_amount: { amount: SHIPPING_COST_PENCE, currency: 'gbp' },
                    display_name: 'UK Mainland Shipping',
                    delivery_estimate: {
                        minimum: { unit: 'business_day', value: 1 },
                        maximum: { unit: 'business_day', value: 3 }
                    }
                }
            }];

        console.log(`Order total: £${orderTotal.toFixed(2)}, Shipping: ${orderTotal >= FREE_SHIPPING_THRESHOLD ? 'FREE' : '£2.99'}`);

        // 2. Create Stripe Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',

            // Shipping options
            shipping_options: shippingOptions,

            // Collect billing address
            billing_address_collection: 'required',

            // Collect shipping address - restricted to UK only
            shipping_address_collection: {
                allowed_countries: ['GB']
            },

            // Custom message about UK mainland shipping
            custom_text: {
                shipping_address: {
                    message: '⚠️ We currently only ship to UK mainland addresses. Unfortunately, we cannot deliver to Northern Ireland, Scottish Highlands/Islands, Isle of Man, or Channel Islands at this time.'
                },
                submit: {
                    message: 'Your order will be shipped within 1-3 business days via Royal Mail.'
                }
            },

            success_url: `${process.env.URL || 'http://localhost:8080'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.URL || 'http://localhost:8080'}/cancel.html`,
            metadata: {
                // Store simplified cart in metadata for webhook
                // Warning: Metadata has 500 char limit.
                cart_items: JSON.stringify(metadataItems).substring(0, 500)
            }
        });

        // 3. Deduct stock immediately (for local dev - in production, webhook handles this)
        // This ensures stock is decremented even when webhook isn't triggered locally
        console.log('Decrementing stock for checkout items...');
        for (const cartItem of cart) {
            try {
                const stockUpdateEvent = {
                    httpMethod: 'POST',
                    body: JSON.stringify({
                        productId: cartItem.id,
                        delta: -cartItem.quantity,
                        action: 'adjust'
                    })
                };
                await inventoryFunction.handler(stockUpdateEvent, context);
                console.log(`✓ Stock decremented for ${cartItem.id} by ${cartItem.quantity}`);
            } catch (stockError) {
                console.error(`Failed to decrement stock for ${cartItem.id}:`, stockError);
            }
        }

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
