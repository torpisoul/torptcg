// ============================================
// GLOBAL STATE
// ============================================

let showOutOfStock = false;

// ============================================
// 1. INVENTORY MANAGEMENT SYSTEM
// ============================================

// Fetch products from inventory endpoint
async function fetchProducts() {
    try {
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const response = await fetch(`/.netlify/functions/inventory?t=${timestamp}`);
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
            title: "Custom FDM Deck Box (Dragon)",
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
            title: "Bespoke Dice Tower (FDM)",
            category: "prints",
            price: 25.00,
            image: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=400&q=80",
            stock: 5,
            available: true
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
// 3. RANDOM SELECTION HELPER
// ============================================

function getRandomItems(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// ============================================
// 4. RENDER FUNCTIONS
// ============================================


// Render products by category sections (initial view)
async function renderProductsByCategory() {
    const container = document.getElementById('product-container');
    if (!container) return;

    container.classList.remove('card-gallery-grid');
    container.classList.add('product-grid');
    container.innerHTML = '<div style="text-align: center; padding: 40px;">Loading products...</div>';

    let allProducts = await fetchProducts();

    // Filter by stock unless showOutOfStock is enabled
    if (!showOutOfStock) {
        allProducts = allProducts.filter(p => p.stock > 0 || p.preOrder === true);
    }

    const categories = [
        { id: 'singles', name: 'Singles', count: 3 },
        { id: 'sealed', name: 'Sealed Product', count: 3 },
        { id: 'accessories', name: 'Accessories', count: 3 },
        { id: 'prints', name: '3D Prints', count: 3 }
    ];

    container.innerHTML = '';

    categories.forEach(cat => {
        const categoryProducts = allProducts.filter(p => p.category === cat.id);
        if (categoryProducts.length === 0) return;

        const randomSelection = getRandomItems(categoryProducts, cat.count);

        const section = document.createElement('div');
        section.className = 'category-section';
        section.innerHTML = `
            <div class="category-header">
                <h3>${cat.name}</h3>
                <button class="view-all-btn" onclick="filterProducts('${cat.id}')">View All ${cat.name}</button>
            </div>
            <div class="product-grid" id="category-${cat.id}"></div>
        `;

        container.appendChild(section);

        const categoryContainer = document.getElementById(`category-${cat.id}`);
        randomSelection.forEach(product => {
            const cardHTML = createProductCard(product);
            categoryContainer.innerHTML += cardHTML;
        });
    });

    // Re-initialize tilt effect
    setTimeout(initTiltEffect, 100);
}

// Render products to the DOM (filtered view)
async function renderProducts(filter = 'all') {
    const container = document.getElementById('product-container');
    if (!container) return;

    container.classList.remove('card-gallery-grid');
    container.classList.add('product-grid');
    container.innerHTML = '<div style="text-align: center; padding: 40px;">Loading products...</div>';

    const allProducts = await fetchProducts();

    // Filter by category
    let filteredProducts = filter === 'all'
        ? allProducts
        : allProducts.filter(p => p.category === filter);

    // Filter by stock unless showOutOfStock is enabled
    if (!showOutOfStock) {
        filteredProducts = filteredProducts.filter(p => p.stock > 0 || p.preOrder === true);
    }

    container.innerHTML = '';

    if (filteredProducts.length === 0) {
        container.innerHTML = '<div class="no-results">No products found in this category.</div>';
        return;
    }

    filteredProducts.forEach(product => {
        const cardHTML = createProductCard(product);
        container.innerHTML += cardHTML;
    });

    // Re-initialize tilt effect
    setTimeout(initTiltEffect, 100);
}

// Create product card HTML
function createProductCard(product) {
    const stockStatus = getStockStatus(product);
    const stockClass = getStockClass(product);
    const purchasable = canPurchase(product);
    const priceDisplay = typeof product.price === 'number' ? `£${product.price.toFixed(2)}` : product.price;

    // Determine button text and action
    let buttonText = 'Add to Cart';
    let buttonAction = `handleAddToCart('${product.id}')`;

    if (!purchasable) {
        buttonText = 'Unavailable';
    } else if (product.stock === 0 && product.preOrder) {
        buttonText = 'Pre-Order';
    } else if (product.stock === 0) {
        buttonText = 'Notify Me';
        buttonAction = `notifyMe('${product.title}')`;
    }

    // Add data-domain attributes for singles cards
    let domainAttr = '';
    let domainAttr2 = '';
    if (product.category === 'singles' && product.domain?.values) {
        const domains = product.domain.values;
        if (domains.length > 0 && domains[0]?.id) {
            domainAttr = ` data-domain="${domains[0].id}"`;
        }
        if (domains.length > 1 && domains[1]?.id) {
            domainAttr2 = ` data-domain-2="${domains[1].id}"`;
        }
    }

    return `
        <div class="product-card" data-product-id="${product.id}"${domainAttr}${domainAttr2}>
            <div class="card-image-wrapper">
                <img src="${product.image}" alt="${product.title}" class="product-image">
                <span class="category-tag">${getCategoryName(product.category)}</span>
            </div>
            <div class="product-details">
                <div class="stock-badge ${stockClass}">${stockStatus}</div>
                <h3 class="product-title">${product.title}</h3>
                <div class="product-price">${priceDisplay}</div>
                <button class="btn-add" ${!purchasable ? 'disabled' : ''} onclick="${buttonAction}">
                    ${buttonText}
                </button>
            </div>
        </div>
    `;
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
// 5. CART & CHECKOUT FUNCTIONS
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
        alert('This product is not available for purchase.');
        return;
    }

    // Update stock (decrease by 1)
    const result = await updateStock(productId, 1);

    if (result.success) {
        alert('✅ Added to cart! Stock updated.');
        // Refresh the product display
        const currentFilter = getCurrentFilterCategory();
        if (currentFilter === 'all-categories') {
            renderProductsByCategory();
        } else {
            renderProducts(currentFilter);
        }
    } else {
        if (result.error === 'insufficient_stock') {
            alert('❌ Sorry, this item is now out of stock. The page will refresh.');
            const currentFilter = getCurrentFilterCategory();
            if (currentFilter === 'all-categories') {
                renderProductsByCategory();
            } else {
                renderProducts(currentFilter);
            }
        } else {
            alert('❌ Unable to add to cart. Please try again.');
        }
    }
}

// ============================================
// 6. 3D TILT EFFECT
// ============================================

function initTiltEffect() {
    const cards = document.querySelectorAll('.product-card');

    cards.forEach(card => {
        if (!card.dataset.styleId) {
            const styleId = 'card-style-' + Math.random().toString(36).substr(2, 9);
            card.dataset.styleId = styleId;
        }

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const xPct = x / rect.width;
            const yPct = y / rect.height;

            const xRot = (0.5 - yPct) * 15;
            const yRot = (xPct - 0.5) * 15;

            card.style.transform = `perspective(1000px) rotateX(${xRot}deg) rotateY(${yRot}deg) scale(1.05)`;

            const shineX = (xPct * 100).toFixed(0);
            const shineY = (yPct * 100).toFixed(0);

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

            const styleId = card.dataset.styleId;
            const styleEl = document.getElementById(styleId);
            if (styleEl) {
                styleEl.textContent = '';
            }
        });
    });
}

function notifyMe(productTitle) {
    const contactSection = document.getElementById('contact');
    if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });

        setTimeout(() => {
            const enquirySelect = document.querySelector('select[name="enquiry-type"]');
            const messageTextarea = document.querySelector('textarea[name="message"]');

            if (enquirySelect) {
                enquirySelect.value = 'notify';
            }

            if (messageTextarea) {
                messageTextarea.value = `Please notify me when "${productTitle}" is back in stock.`;
            }
        }, 500);
    }
}

// ============================================
// 7. FILTER AND TOGGLE FUNCTIONS
// ============================================

function filterProducts(category) {
    // Update active button state
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const buttons = document.querySelectorAll('.filter-btn');
    for (let btn of buttons) {
        const onclick = btn.getAttribute('onclick');
        if (onclick && onclick.includes(category)) {
            btn.classList.add('active');
            break;
        }
    }

    // Handle Singles category specially
    if (category === 'singles') {
        const filtersContainer = document.getElementById('show-filters-container');
        if (filtersContainer) filtersContainer.style.display = 'block';

        // Initialize card search if available
        if (window.initCardSearch) {
            window.initCardSearch();
        } else {
            // Fallback if cards-script.js hasn't loaded
            renderProducts(category);
        }
    } else {
        // Hide filters for non-singles
        const filtersContainer = document.getElementById('show-filters-container');
        if (filtersContainer) filtersContainer.style.display = 'none';

        const searchPanel = document.getElementById('card-search-panel');
        if (searchPanel) searchPanel.style.display = 'none';

        const toggleBtn = document.getElementById('toggle-search');
        if (toggleBtn) toggleBtn.innerHTML = '▼ Show Filters';

        // Render standard products
        renderProducts(category);
    }
}

function toggleCardSearch() {
    const panel = document.getElementById('card-search-panel');
    const btn = document.getElementById('toggle-search');

    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        btn.innerHTML = '▲ Hide Filters';
    } else {
        panel.style.display = 'none';
        btn.innerHTML = '▼ Show Filters';
    }
}

function toggleOutOfStock() {
    const checkbox = document.getElementById('show-out-of-stock');
    showOutOfStock = checkbox.checked;

    // Get current filter
    const activeBtn = document.querySelector('.filter-btn.active');
    let currentFilter = 'all';

    if (activeBtn) {
        const onclick = activeBtn.getAttribute('onclick');
        if (onclick) {
            const match = onclick.match(/filterProducts\('(.+?)'\)/);
            if (match) currentFilter = match[1];
        }
    }

    // Re-render with current filter
    if (currentFilter === 'singles' && typeof window.renderCards === 'function') {
        window.renderCards();
    } else {
        renderProducts(currentFilter);
    }
}

// Helper to get current filter category
function getCurrentFilterCategory() {
    const activeBtn = document.querySelector('.filter-btn.active');
    if (!activeBtn) return 'all';

    const onclick = activeBtn.getAttribute('onclick');
    if (!onclick) return 'all';

    const match = onclick.match(/filterProducts\('(.+?)'\)/);
    return match ? match[1] : 'all';
}

// ============================================
// PRODUCT SEARCH FUNCTION
// ============================================

function handleProductSearch() {
    const searchInput = document.getElementById('product-search');
    if (!searchInput) return;

    const searchTerm = searchInput.value.toLowerCase().trim();
    const productCards = document.querySelectorAll('.product-card');

    productCards.forEach(card => {
        // Get product name and ID from the card
        const nameElement = card.querySelector('.product-name, h3');
        const productName = nameElement ? nameElement.textContent.toLowerCase() : '';

        // Try to get product ID from various possible locations
        const productId = card.getAttribute('data-product-id') ||
            card.getAttribute('data-id') ||
            card.id || '';

        // Check if search term matches name or ID
        const matchesSearch = searchTerm === '' ||
            productName.includes(searchTerm) ||
            productId.toLowerCase().includes(searchTerm);

        // Show/hide card based on search match
        if (matchesSearch) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });

    // Update "no results" message if needed
    // Count visible cards from the productCards we already have
    let visibleCount = 0;
    productCards.forEach(card => {
        if (card.style.display !== 'none') visibleCount++;
    });

    const container = document.getElementById('product-container');

    if (container) {
        // Remove existing "no results" message
        const existingMsg = container.querySelector('.no-results-message');
        if (existingMsg) {
            existingMsg.remove();
        }

        // Add "no results" message if no cards are visible
        if (searchTerm && visibleCount === 0) {
            const noResultsMsg = document.createElement('div');
            noResultsMsg.className = 'no-results-message';
            noResultsMsg.style.cssText = 'text-align: center; padding: 40px; color: var(--text-muted); font-size: 1.1rem;';
            noResultsMsg.innerHTML = `
                <p>No products found matching "${searchTerm}"</p>
                <p style="font-size: 0.9rem; margin-top: 10px;">Try a different search term</p>
            `;
            container.appendChild(noResultsMsg);
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('product-container')) {
        renderProducts('all');
    }
});

// ============================================
// 8. CARD MODAL FUNCTIONS
// ============================================

function openCardModal(product) {
    const modal = document.getElementById('card-modal');
    const modalImage = document.getElementById('modal-card-image');
    const modalInfo = document.getElementById('modal-card-info');

    if (!modal || !modalImage || !modalInfo) return;

    // Set image
    modalImage.src = product.image || product.cardImage?.url || '';
    modalImage.alt = product.title || product.name || 'Card';

    // Build info HTML
    const title = product.title || product.name || 'Unknown Card';
    const price = product.price !== undefined ? `£${product.price.toFixed(2)}` : 'Price not set';
    const stock = product.stock || 0;
    const stockClass = stock === 0 ? 'stock-out' : (stock <= 5 ? 'stock-low' : 'stock-in');
    const stockText = stock === 0 ? 'Out of Stock' : (stock <= 5 ? `Only ${stock} left!` : 'In Stock');

    // Extract card details
    const setName = product.set?.value?.label || product.set?.label || '';
    const rarity = product.rarity?.label || '';
    const domains = [];
    if (product.domain?.values) {
        product.domain.values.forEach(d => domains.push(d.label));
    }
    const cardType = product.cardType?.type?.map(t => t.label).join(', ') || product.type || '';
    const energy = product.energy?.value !== undefined ? product.energy.value : '';
    const might = product.might?.value !== undefined ? product.might.value : '';

    let infoHTML = `
        <h2>${title}</h2>
        <div class="card-price">${price}</div>
        <div class="card-stock ${stockClass}">${stockText}</div>
        
        <div class="card-details">
    `;

    if (setName) {
        infoHTML += `
            <div class="detail-row">
                <span class="detail-label">Set:</span>
                <span class="detail-value">${setName}</span>
            </div>
        `;
    }

    if (product.publicCode || product.id) {
        infoHTML += `
            <div class="detail-row">
                <span class="detail-label">Card ID:</span>
                <span class="detail-value">${product.publicCode || product.id}</span>
            </div>
        `;
    }

    if (cardType) {
        infoHTML += `
            <div class="detail-row">
                <span class="detail-label">Type:</span>
                <span class="detail-value">${cardType}</span>
            </div>
        `;
    }

    if (domains.length > 0) {
        infoHTML += `
            <div class="detail-row">
                <span class="detail-label">Domain:</span>
                <span class="detail-value">${domains.join(', ')}</span>
            </div>
        `;
    }

    if (rarity) {
        infoHTML += `
            <div class="detail-row">
                <span class="detail-label">Rarity:</span>
                <span class="detail-value">${rarity}</span>
            </div>
        `;
    }

    if (energy !== '') {
        infoHTML += `
            <div class="detail-row">
                <span class="detail-label">Energy:</span>
                <span class="detail-value">${energy}</span>
            </div>
        `;
    }

    if (might !== '') {
        infoHTML += `
            <div class="detail-row">
                <span class="detail-label">Might:</span>
                <span class="detail-value">${might}</span>
            </div>
        `;
    }

    if (product.description) {
        infoHTML += `
            <div class="detail-row">
                <span class="detail-label">Description:</span>
                <span class="detail-value">${product.description}</span>
            </div>
        `;
    }

    infoHTML += `</div>`;

    // Add action buttons
    infoHTML += `<div class="modal-actions">`;
    if (stock > 0) {
        infoHTML += `<button class="btn" onclick="handleAddToCart('${product.id || product.publicCode}')">Add to Cart</button>`;
    } else {
        infoHTML += `<button class="btn-secondary btn" onclick="notifyMe('${title}')">Notify When Available</button>`;
    }
    infoHTML += `</div>`;

    modalInfo.innerHTML = infoHTML;

    // Show modal
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

function closeCardModal(event) {
    const modal = document.getElementById('card-modal');
    if (!modal) return;

    // Only close if clicking the modal background or close button
    if (event && event.target !== modal && !event.target.classList.contains('modal-close')) {
        return;
    }

    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);

    // Restore body scroll
    document.body.style.overflow = '';
}

// Close modal on ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeCardModal({ target: document.getElementById('card-modal') });
    }
});

// Add click handlers to card images for modal
function initCardModalHandlers() {
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        const imageWrapper = card.querySelector('.card-image-wrapper');
        const productDataAttr = card.getAttribute('data-product');

        if (imageWrapper) {
            // Make image clickable
            imageWrapper.style.cursor = 'pointer';
            imageWrapper.title = 'Click to view details';

            imageWrapper.addEventListener('click', () => {
                // Get product data from the card
                const productId = card.getAttribute('data-product-id');

                // Find product in current products array
                if (window.currentProducts) {
                    const product = window.currentProducts.find(p => p.id === productId || p.publicCode === productId);
                    if (product) {
                        openCardModal(product);
                    }
                }
            });
        }
    });
}

// Override renderProducts to add modal support
const _originalRenderProducts = renderProducts;
renderProducts = async function (filter = 'all') {
    await _originalRenderProducts(filter);
    window.currentProducts = await fetchProducts();
    setTimeout(initCardModalHandlers, 150);
};

// ============================================
// 9. STRIPE PAYMENT LINK SUPPORT
// ============================================

// ============================================
// 9. STRIPE PAYMENT LINK SUPPORT
// ============================================

// Override createProductCard to add Stripe support
const _originalCreateProductCard = createProductCard;
createProductCard = function (product) {
    const stockStatus = getStockStatus(product);
    const stockClass = getStockClass(product);
    const purchasable = canPurchase(product);
    const priceDisplay = typeof product.price === 'number' ? `£${product.price.toFixed(2)}` : product.price;

    // Determine button HTML
    let buttonHTML = '';

    if (!purchasable) {
        buttonHTML = `<button class="btn-add" disabled>Unavailable</button>`;
    } else if (product.stock === 0 && product.preOrder) {
        buttonHTML = `<button class="btn-add" onclick="handleAddToCart('${product.id}')">Pre-Order</button>`;
    } else if (product.stock === 0) {
        buttonHTML = `<button class="btn-add" onclick="notifyMe('${product.title}')">Notify Me</button>`;
    } else if (product.stripePaymentLink) {
        // Use Stripe Payment Link if available
        buttonHTML = `<a href="${product.stripePaymentLink}" class="btn-add" target="_blank" rel="noopener" style="display: inline-block; text-align: center; text-decoration: none; line-height: 1.5;">Buy Now</a>`;
    } else {
        // Fallback to cart
        buttonHTML = `<button class="btn-add" onclick="handleAddToCart('${product.id}')">Add to Cart</button>`;
    }

    // Add data-domain attributes for singles cards
    let domainAttr = '';
    let domainAttr2 = '';
    if (product.category === 'singles' && product.domain?.values) {
        const domains = product.domain.values;
        if (domains.length > 0 && domains[0]?.id) {
            domainAttr = ` data-domain="${domains[0].id}"`;
        }
        if (domains.length > 1 && domains[1]?.id) {
            domainAttr2 = ` data-domain-2="${domains[1].id}"`;
        }
    }

    return `
        <div class="product-card" data-product-id="${product.id}"${domainAttr}${domainAttr2}>
            <div class="card-image-wrapper">
                <img src="${product.image}" alt="${product.title}" class="product-image">
                <span class="category-tag">${getCategoryName(product.category)}</span>
            </div>
            <div class="product-details">
                <div class="stock-badge ${stockClass}">${stockStatus}</div>
                <h3 class="product-title">${product.title}</h3>
                <div class="product-price">${priceDisplay}</div>
                ${buttonHTML}
            </div>
        </div>
    `;
};
