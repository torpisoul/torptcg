// ============================================
// 1. INVENTORY MANAGEMENT SYSTEM
// ============================================

// Fetch products from inventory endpoint
async function fetchProducts() {
    try {
        const response = await fetch('/.netlify/functions/inventory');
        if (!response.ok) {
            console.warn('Inventory data not available, using fallback data');
            return getFallbackProducts();
        }
        const data = await response.json();
        // Handle both array and object with products property
        const products = Array.isArray(data) ? data : (data.products || []);
        return products;
    } catch (error) {
        console.error('Error loading inventory:', error);
        return getFallbackProducts();
    }
}

// Update stock for a product (for checkout/purchase)
async function updateStock(productId, quantity) {
    try {
        const response = await fetch('/.netlify/functions/inventory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productId: productId,
                delta: -quantity // Negative for purchase
            })
        });

        const result = await response.json();

        if (!response.ok) {
            if (response.status === 409) {
                // Insufficient stock
                return { success: false, error: 'insufficient_stock', data: result };
            }
            return { success: false, error: 'update_failed', data: result };
        }

        return { success: true, data: result };
    } catch (error) {
        console.error('Error updating stock:', error);
        return { success: false, error: 'network_error' };
    }
}

// Fallback products if the inventory system is not available
function getFallbackProducts() {
    return [
        {
            id: "p001",
            title: "Riftbound: Origins Booster Box",
            category: "sealed",
            price: 120.00,
            image: "https://images.unsplash.com/photo-1620336655055-088d06e36bf0?auto=format&fit=crop&w=400&q=80",
            stock: 15,
            available: true
        },
        {
            id: "p002",
            title: "Void Walker (Ultra Rare)",
            category: "singles",
            price: 45.00,
            image: "https://images.unsplash.com/photo-1601987177651-8edfe6c20009?auto=format&fit=crop&w=400&q=80",
            stock: 3,
            available: true
        },
        {
            id: "p003",
            title: "Custom Resin Deck Box (Dragon)",
            category: "prints",
            price: 35.00,
            image: "https://images.unsplash.com/photo-1615815707923-2d1d9a637276?auto=format&fit=crop&w=400&q=80",
            stock: 0,
            available: true,
            preOrder: true
        },
        {
            id: "p004",
            title: "Riftbound Starter Deck: Aether",
            category: "sealed",
            price: 14.99,
            image: "https://images.unsplash.com/photo-1607462109225-6b64ae2dd3cb?auto=format&fit=crop&w=400&q=80",
            stock: 25,
            available: true
        },
        {
            id: "p005",
            title: "Chibi Voidling Plushie",
            category: "accessories",
            price: 18.00,
            image: "https://images.unsplash.com/photo-1559479014-48e5da45043b?auto=format&fit=crop&w=400&q=80",
            stock: 12,
            available: true
        },
        {
            id: "p006",
            title: "Bespoke Hero Miniature (Painted)",
            category: "prints",
            price: 50.00,
            image: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=400&q=80",
            stock: 0,
            available: true,
            preOrder: true
        }
    ];
}

// ============================================
// 2. STOCK DISPLAY HELPERS
// ============================================

// Get stock status text
function getStockStatus(product) {
    const stock = product.stock || 0;

    if (stock === 0) {
        if (product.preOrder || product.available) {
            return "Made to Order";
        }
        return "Out of Stock";
    }

    if (stock <= 5) {
        return `Only ${stock} left!`;
    }

    return "In Stock";
}

// Get stock badge class for styling
function getStockClass(product) {
    const stock = product.stock || 0;

    if (stock === 0 && !product.preOrder && !product.available) {
        return 'stock-out';
    }

    if (stock <= 5) {
        return 'stock-low';
    }

    return 'stock-in';
}

// Check if product can be purchased
function canPurchase(product) {
    return product.available !== false && (product.stock > 0 || product.preOrder === true);
}

// ============================================
// 3. RENDER FUNCTIONS
// ============================================

// Render products to the DOM
async function renderProducts(filter = 'all') {
    const container = document.getElementById('product-container');
    if (!container) return; // Guard clause for admin page

    container.innerHTML = '<div style="text-align: center; padding: 40px;">Loading products...</div>';

    const products = await fetchProducts();

    const filteredProducts = filter === 'all'
        ? products
        : products.filter(p => p.category === filter);

    container.innerHTML = '';

    if (filteredProducts.length === 0) {
        container.innerHTML = '<div class="no-results">No products found in this category.</div>';
        return;
    }

    filteredProducts.forEach(product => {
        const stockStatus = getStockStatus(product);
        const stockClass = getStockClass(product);
        const purchasable = canPurchase(product);
        const priceDisplay = typeof product.price === 'number' ? `£${product.price.toFixed(2)}` : product.price;

        const cardHTML = `
            <div class="product-card" data-product-id="${product.id}" data-aos="fade-up">
                <div class="card-image-wrapper">
                    <img src="${product.image}" alt="${product.title}" class="product-image">
                    <span class="category-tag">${getCategoryName(product.category)}</span>
                </div>
                <div class="product-details">
                    <div class="stock-badge ${stockClass}">${stockStatus}</div>
                    <h3 class="product-title">${product.title}</h3>
                    <div class="product-price">${priceDisplay}</div>
                    <button class="btn-add" ${!purchasable ? 'disabled' : ''} onclick="handleAddToCart('${product.id}')">
                        ${purchasable ? 'Add to Cart' : 'Unavailable'}
                    </button>
                </div>
            </div>
        `;
        container.innerHTML += cardHTML;
    });

    // Re-initialize tilt effect after products are rendered
    setTimeout(initTiltEffect, 100);
}

// Helper to get nice category names
function getCategoryName(cat) {
    const map = {
        'singles': 'Single Card',
        'sealed': 'Sealed Product',
        'accessories': 'Accessory',
        'prints': '3D Print'
    };
    return map[cat] || cat;
}

// ============================================
// 4. CART & CHECKOUT FUNCTIONS
// ============================================

// Handle add to cart with stock validation
async function handleAddToCart(productId) {
    // Fetch current inventory to validate stock
    const products = await fetchProducts();
    const product = products.find(p => p.id === productId);

    if (!product) {
        alert('Product not found. Please refresh the page.');
        return;
    }

    if (!canPurchase(product)) {
        alert('This product is currently unavailable.');
        return;
    }

    // For now, just show a confirmation
    // In a real implementation, you would add to cart and update on checkout
    const confirmed = confirm(`Add "${product.title}" to cart?\n\nPrice: £${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}\nStock: ${product.stock > 0 ? product.stock + ' available' : 'Made to order'}`);

    if (confirmed) {
        // Simulate checkout - in production, this would happen at checkout
        const result = await updateStock(productId, 1);

        if (result.success) {
            alert('✅ Added to cart! Stock updated.');
            // Refresh the product display
            const currentFilter = document.querySelector('.filter-btn.active')?.textContent.toLowerCase() || 'all';
            renderProducts(currentFilter === 'all' ? 'all' : getCurrentFilterCategory());
        } else {
            if (result.error === 'insufficient_stock') {
                alert('❌ Sorry, this item is now out of stock. The page will refresh.');
                renderProducts(getCurrentFilterCategory());
            } else {
                alert('❌ Unable to add to cart. Please try again.');
            }
        }
    }
}

// Get current filter category
function getCurrentFilterCategory() {
    const activeBtn = document.querySelector('.filter-btn.active');
    if (!activeBtn) return 'all';

    const onclick = activeBtn.getAttribute('onclick');
    if (!onclick) return 'all';

    const match = onclick.match(/filterProducts\('(.+?)'\)/);
    return match ? match[1] : 'all';
}

// ============================================
// 5. FILTER FUNCTIONS
// ============================================

function filterProducts(category) {
    // Update active button state
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Find the button that was clicked - handle both click event and direct call
    const buttons = document.querySelectorAll('.filter-btn');
    for (let btn of buttons) {
        const onclick = btn.getAttribute('onclick');
        if (onclick && onclick.includes(category)) {
            btn.classList.add('active');
            break;
        }
    }

    renderProducts(category);
}

// ============================================
// 6. 3D TILT EFFECT
// ============================================

// 3D Tilt Effect with Dynamic Holographic Shine
function initTiltEffect() {
    const cards = document.querySelectorAll('.product-card');

    cards.forEach(card => {
        // Create a style element for this specific card if it doesn't exist
        if (!card.dataset.styleId) {
            const styleId = 'card-style-' + Math.random().toString(36).substr(2, 9);
            card.dataset.styleId = styleId;
        }

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Calculate percentages
            const xPct = x / rect.width;
            const yPct = y / rect.height;

            // Calculate rotation (reduced to 15 degrees for subtlety)
            const xRot = (0.5 - yPct) * 15; // Rotate X axis based on Y position
            const yRot = (xPct - 0.5) * 15; // Rotate Y axis based on X position

            // Apply 3D transform
            card.style.transform = `perspective(1000px) rotateX(${xRot}deg) rotateY(${yRot}deg) scale(1.05)`;

            // Update shine position to follow mouse
            const shineX = (xPct * 100).toFixed(0);
            const shineY = (yPct * 100).toFixed(0);

            // Dynamically update the ::before pseudo-element's gradient position
            const styleId = card.dataset.styleId;
            let styleEl = document.getElementById(styleId);

            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = styleId;
                document.head.appendChild(styleEl);
            }

            styleEl.textContent = `
                .product-card[data-style-id="${styleId}"]::before {
                    background: radial-gradient(
                        circle at ${shineX}% ${shineY}%,
                        rgba(255, 255, 255, 0.4) 0%,
                        rgba(255, 255, 255, 0.2) 20%,
                        rgba(255, 255, 255, 0.1) 40%,
                        transparent 60%
                    ) !important;
                }
            `;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';

            // Reset shine to center
            const styleId = card.dataset.styleId;
            const styleEl = document.getElementById(styleId);
            if (styleEl) {
                styleEl.textContent = '';
            }
        });
    });
}

// ============================================
// 7. INITIALIZATION
// ============================================

// Initial Render
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('product-container')) {
        renderProducts('all');
    }
});