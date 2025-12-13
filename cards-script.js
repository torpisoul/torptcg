// ============================================
// CARD GALLERY - SEARCH & FILTER SYSTEM
// ============================================

let allCards = [];
let filteredCards = [];

// Image cache for CDN images
const imageCache = new Map();

// ============================================
// 1. FETCH CARDS FROM JSONBIN
// ============================================

async function fetchCards() {
    try {
        const response = await fetch('/.netlify/functions/cards');
        if (!response.ok) {
            console.error('Failed to fetch cards:', response.status);
            return [];
        }

        const data = await response.json();

        // Handle the nested structure from card-gallery.json
        let cards = [];
        if (data.page && data.page.cards && data.page.cards.items) {
            cards = data.page.cards.items;
        } else {
            cards = Array.isArray(data) ? data : (data.cards || []);
        }

        // Fetch inventory and merge
        try {
            const inventoryResponse = await fetch('/.netlify/functions/inventory');
            if (inventoryResponse.ok) {
                const inventory = await inventoryResponse.json();

                // Create inventory map with stock AND price
                const inventoryMap = {};
                inventory.forEach(item => {
                    if (item.id) {
                        inventoryMap[item.id] = {
                            stock: item.stock,
                            price: item.price
                        };
                    }
                });

                // Merge stock and price data into cards
                cards = cards.map(card => {
                    const invData = inventoryMap[card.id];
                    // Default to 0 stock if missing from inventory
                    let stock = invData ? invData.stock : 0;
                    // Use price from inventory if available, otherwise keep card's price or default to 0.50
                    let price = invData?.price !== undefined ? invData.price : (card.price !== undefined ? card.price : 0.50);

                    return {
                        ...card,
                        stock,
                        price
                    };
                });
            }
        } catch (invError) {
            console.warn('Could not fetch inventory, cards will show without stock:', invError);
        }

        return cards;
    } catch (error) {
        console.error('Error fetching cards:', error);
        return [];
    }
}

// ============================================
// 2. IMAGE CACHING SYSTEM
// ============================================

/**
 * Preload and cache an image from CDN
 * @param {string} url - Image URL
 * @returns {Promise<string>} - Returns the URL when loaded
 */
function cacheImage(url) {
    if (imageCache.has(url)) {
        return Promise.resolve(url);
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            imageCache.set(url, true);
            resolve(url);
        };
        img.onerror = () => {
            console.warn('Failed to cache image:', url);
            resolve(url); // Still resolve to allow display
        };
        img.src = url;
    });
}

/**
 * Batch cache multiple images
 * @param {Array<string>} urls - Array of image URLs
 */
async function batchCacheImages(urls) {
    const uniqueUrls = [...new Set(urls)];
    const promises = uniqueUrls.map(url => cacheImage(url));
    await Promise.allSettled(promises);
    console.log(`Cached ${imageCache.size} images`);
}

// ============================================
// 3. SEARCH & FILTER LOGIC
// ============================================

/**
 * Extract searchable text from HTML
 */
function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

/**
 * Fuzzy search - checks if search term appears in text
 */
function fuzzyMatch(text, search) {
    if (!search) return true;
    if (!text) return false;
    return text.toLowerCase().includes(search.toLowerCase());
}

/**
 * Apply all filters to cards
 */
function applyFilters() {
    const filters = {
        name: document.getElementById('search-name').value.trim(),
        id: document.getElementById('search-id').value.trim(),
        ability: document.getElementById('search-ability').value.trim(),
        priceMin: parseFloat(document.getElementById('price-min').value) || null,
        priceMax: parseFloat(document.getElementById('price-max').value) || null,
        energyMin: parseInt(document.getElementById('energy-min').value) || null,
        energyMax: parseInt(document.getElementById('energy-max').value) || null,
        mightMin: parseInt(document.getElementById('might-min').value) || null,
        mightMax: parseInt(document.getElementById('might-max').value) || null,
        type: document.getElementById('filter-type').value,
        rarity: document.getElementById('filter-rarity').value,
        domain: document.getElementById('filter-domain').value,
        set: document.getElementById('filter-set').value
    };

    filteredCards = allCards.filter(card => {
        // Name filter
        if (filters.name && !fuzzyMatch(card.name, filters.name)) {
            return false;
        }

        // Price filter
        const price = card.price !== undefined ? card.price : 0.50; // Default price
        if (filters.priceMin !== null && price < filters.priceMin) return false;
        if (filters.priceMax !== null && price > filters.priceMax) return false;

        // ID/Public Code filter (fuzzy - typing "56" should match "ogn-056-298")
        if (filters.id) {
            const idMatch = fuzzyMatch(card.id, filters.id) ||
                fuzzyMatch(card.publicCode, filters.id) ||
                fuzzyMatch(String(card.collectorNumber), filters.id);
            if (!idMatch) return false;
        }

        // Ability text filter
        if (filters.ability) {
            const abilityText = card.text?.richText?.body ? stripHtml(card.text.richText.body) : '';
            if (!fuzzyMatch(abilityText, filters.ability)) {
                return false;
            }
        }

        // Energy range filter
        const energy = card.energy?.value?.id;
        if (energy !== undefined) {
            if (filters.energyMin !== null && energy < filters.energyMin) return false;
            if (filters.energyMax !== null && energy > filters.energyMax) return false;
        }

        // Might range filter
        const might = card.might?.value?.id;
        if (might !== undefined) {
            if (filters.mightMin !== null && might < filters.mightMin) return false;
            if (filters.mightMax !== null && might > filters.mightMax) return false;
        }

        // Type filter
        if (filters.type) {
            const typeId = card.cardType?.type?.[0]?.id;
            const superTypes = (card.cardType?.superType || []).map(st => st.id);

            if (filters.type === 'legend') {
                if (typeId !== 'legend') return false;
            } else if (filters.type === 'signature') {
                // Signature Spells are Spells with Signature supertype
                if (typeId !== 'spell' || !superTypes.includes('signature')) return false;
            } else {
                if (typeId !== filters.type) return false;
            }
        }

        // Rarity filter
        if (filters.rarity) {
            const rarity = card.rarity?.value?.id;
            if (rarity !== filters.rarity) return false;
        }

        // Domain filter
        if (filters.domain) {
            const domains = card.domain?.values || [];
            const hasDomain = domains.some(d => d.id === filters.domain);
            if (!hasDomain) return false;
        }

        // Set filter
        if (filters.set) {
            const cardSet = card.set?.value?.id;
            if (cardSet !== filters.set) return false;
        }

        return true;
    });

    renderCards();
}

/**
 * Reset all filters
 */
function resetFilters() {
    document.getElementById('search-name').value = '';
    document.getElementById('search-id').value = '';
    document.getElementById('search-ability').value = '';
    document.getElementById('price-min').value = '';
    document.getElementById('price-max').value = '';
    document.getElementById('energy-min').value = '';
    document.getElementById('energy-max').value = '';
    document.getElementById('might-min').value = '';
    document.getElementById('might-max').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-rarity').value = '';
    document.getElementById('filter-domain').value = '';
    document.getElementById('filter-set').value = '';

    filteredCards = [...allCards];
    renderCards();
}

/**
 * Update results count display
 */
/**
 * Get stock status text for display
 */
function getCardStockStatus(card) {
    const stock = card.stock !== undefined ? card.stock : 0;

    if (stock === 0) {
        return 'Out of Stock';
    } else if (stock <= 5) {
        return `Only ${stock} left!`;
    } else {
        return 'In Stock';
    }
}

/**
 * Get stock status CSS class
 */
function getCardStockClass(card) {
    const stock = card.stock !== undefined ? card.stock : 0;

    if (stock === 0) {
        return 'stock-out';
    } else if (stock <= 5) {
        return 'stock-low';
    } else {
        return 'stock-in';
    }
}

/**
 * Check if card can be purchased
 */
function canPurchaseCard(card) {
    const stock = card.stock !== undefined ? card.stock : 0;
    return stock > 0;
}

/**
 * Create a card DOM element matching the "All" page product card structure
 */
function createCardElement(card) {
    const div = document.createElement('div');
    div.className = 'product-card single-card';
    div.setAttribute('data-product-id', card.id || card.publicCode);

    // Add domain data attribute for CSS styling
    const domains = card.domain?.values || [];
    if (domains.length > 0) {
        const domainId = domains[0]?.id || '';
        if (domainId) {
            div.setAttribute('data-domain', domainId);
        }

        // For dual-domain cards, add second domain
        if (domains.length > 1) {
            const domainId2 = domains[1]?.id || '';
            if (domainId2) {
                div.setAttribute('data-domain-2', domainId2);
            }
        }
    }

    // Extract data
    const name = card.name || 'Unknown';
    const imageUrl = card.cardImage?.url || '';
    const publicCode = card.publicCode || card.id;

    // Stock information
    const stockStatus = getCardStockStatus(card);
    const stockClass = getCardStockClass(card);
    const purchasable = canPurchaseCard(card);

    // Price - default to £0.50 for singles if not specified
    const price = card.price !== undefined ? card.price : 0.50;
    const priceDisplay = `£${price.toFixed(2)}`;

    // Button configuration
    let buttonText = 'Add to Cart';
    let buttonAction = `handleCardPurchase('${publicCode}', '${name.replace(/'/g, "\\'")}', ${price})`;

    if (!purchasable) {
        buttonText = 'Notify Me';
        buttonAction = `notifyMe('${name.replace(/'/g, "\\'")}')`;
    }

    // Build HTML matching product-card structure from All page
    div.innerHTML = `
    <div class="card-image-wrapper">
        <img src="${imageUrl}" alt="${name}" class="product-image" loading="lazy">
        <div class="tag-group">
            <span class="category-tag">Single Card</span>
            <span class="product-price-tag">${priceDisplay}</span>
        </div>
    </div>
    <div class="product-details">
        <div class="stock-badge ${stockClass}">${stockStatus}</div>
        <h3 class="product-title">${name}</h3>
        <button class="btn-add" ${!purchasable ? 'disabled' : ''} onclick="${buttonAction}">
            ${buttonText}
        </button>
    </div>
`;

    return div;
}

// ============================================
// 5. INITIALIZATION
// ============================================

let isCardSearchInitialized = false;

async function initCardSearch() {
    if (isCardSearchInitialized) {
        renderCards();
        return;
    }

    console.log('Initializing card gallery...');

    // Fetch cards
    allCards = await fetchCards();
    filteredCards = [...allCards];

    console.log(`Loaded ${allCards.length} cards`);

    // Render initial cards
    renderCards();

    // Cache all card images in the background
    const imageUrls = allCards
        .map(card => card.cardImage?.url)
        .filter(url => url);

    batchCacheImages(imageUrls).then(() => {
        console.log('All card images cached for faster browsing');
    });

    // Set up event listeners
    const applyBtn = document.getElementById('apply-card-filters');
    if (applyBtn) applyBtn.addEventListener('click', applyFilters);

    const resetBtn = document.getElementById('reset-card-filters');
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);

    // Real-time search on Enter key
    const searchInputs = [
        'search-name', 'search-id', 'search-ability',
        'price-min', 'price-max',
        'energy-min', 'energy-max', 'might-min', 'might-max'
    ];

    searchInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    applyFilters();
                }
            });
        }
    });

    // Auto-apply on dropdown change
    const dropdowns = ['filter-type', 'filter-rarity', 'filter-domain'];
    dropdowns.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.addEventListener('change', applyFilters);
        }
    });

    // Toggle search panel - removed as this is now handled in script.js

    isCardSearchInitialized = true;
}

// Update renderCards to target product-container
function renderCards() {
    const container = document.getElementById('product-container');
    if (!container) return;

    container.innerHTML = '';
    container.classList.remove('product-grid');
    container.classList.add('card-gallery-grid');

    if (filteredCards.length === 0) {
        container.innerHTML = '<div class="no-results">No cards found matching your filters.</div>';
        return;
    }

    // Apply out-of-stock filter based on global showOutOfStock flag
    let cardsToDisplay = filteredCards;
    if (!showOutOfStock) {
        cardsToDisplay = filteredCards.filter(card => {
            const stock = card.stock !== undefined ? card.stock : 0;
            return stock > 0;
        });
    }

    cardsToDisplay.forEach(card => {
        const cardEl = createCardElement(card);
        container.appendChild(cardEl);
    });

    updateResultsCount(cardsToDisplay.length);

    // Initialize 3D tilt effect for card gallery
    setTimeout(() => {
        if (typeof initTiltEffect === 'function') {
            initTiltEffect();
        }
    }, 100);
}

// Update updateResultsCount to target card-results-count
function updateResultsCount(displayCount) {
    const countEl = document.getElementById('card-results-count');
    if (countEl) {
        const count = displayCount !== undefined ? displayCount : filteredCards.length;
        countEl.textContent = `Showing ${count} of ${allCards.length} cards`;
    }
}

// Expose to window
window.initCardSearch = initCardSearch;
window.renderCards = renderCards;
// ICONS (Duplicated for now, or could be shared if I refactor, but keeping self-contained is safer)
const ICONS_CARDS = {
    basket: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`,
    bell: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
    ban: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>`
};

function animateAndAddCard(btnElement, publicCode, name, price) {
    // Start animation
    const card = btnElement.closest('.product-card');
    const img = card.querySelector('.product-image');
    const cartIcon = document.getElementById('shopping-cart-icon');

    if (img && cartIcon) {
        const imgRect = img.getBoundingClientRect();
        const cartRect = cartIcon.getBoundingClientRect();

        const flyingImg = img.cloneNode();
        flyingImg.classList.add('flying-card');
        flyingImg.style.width = `${imgRect.width}px`;
        flyingImg.style.height = `${imgRect.height}px`;
        flyingImg.style.top = `${imgRect.top}px`;
        flyingImg.style.left = `${imgRect.left}px`;

        document.body.appendChild(flyingImg);

        // Force reflow
        void flyingImg.offsetWidth;

        flyingImg.style.top = `${cartRect.top + cartRect.height / 2}px`;
        flyingImg.style.left = `${cartRect.left + cartRect.width / 2}px`;
        flyingImg.style.width = '20px';
        flyingImg.style.height = '20px';
        flyingImg.style.opacity = '0';

        setTimeout(() => {
            flyingImg.remove();
            cartIcon.classList.add('jiggle');
            setTimeout(() => cartIcon.classList.remove('jiggle'), 600);
        }, 800);
    }

    // Call purchase handler
    handleCardPurchase(publicCode, name, price);
}

// Override createCardElement
createCardElement = function (card) {
    const div = document.createElement('div');
    div.className = 'product-card single-card';
    div.setAttribute('data-product-id', card.id || card.publicCode);

    // Add domain data attribute for CSS styling
    const domains = card.domain?.values || [];
    if (domains.length > 0) {
        const domainId = domains[0]?.id || '';
        if (domainId) {
            div.setAttribute('data-domain', domainId);
        }

        // For dual-domain cards, add second domain
        if (domains.length > 1) {
            const domainId2 = domains[1]?.id || '';
            if (domainId2) {
                div.setAttribute('data-domain-2', domainId2);
            }
        }
    }

    // Extract data
    const name = card.name || 'Unknown';
    const imageUrl = card.cardImage?.url || '';
    const publicCode = card.publicCode || card.id;

    // Stock information
    const stockStatus = getCardStockStatus(card);
    const stockClass = getCardStockClass(card);
    const purchasable = canPurchaseCard(card);

    // Price - default to £0.50 for singles if not specified
    const price = card.price !== undefined ? card.price : 0.50;
    const priceDisplay = `£${price.toFixed(2)}`;

    let actionHtml = '';
    const safeName = name.replace(/'/g, "\\'");

    if (!purchasable) {
        actionHtml = `<div class="card-action-icon disabled" title="Unavailable">${ICONS_CARDS.ban}</div>`;
    } else {
        // Since singles are always add to cart or notify (stock based)
        // Check stock
        const stock = card.stock !== undefined ? card.stock : 0;
        if (stock > 0) {
            actionHtml = `<div class="card-action-icon" onclick="animateAndAddCard(this, '${publicCode}', '${safeName}', ${price})" title="Add to Cart">${ICONS_CARDS.basket}</div>`;
        } else {
            actionHtml = `<div class="card-action-icon" onclick="notifyMe('${safeName}')" title="Notify Me">${ICONS_CARDS.bell}</div>`;
        }
    }

    // Build HTML
    div.innerHTML = `
    <div class="card-image-wrapper">
        <img src="${imageUrl}" alt="${name}" class="product-image" loading="lazy">
        <div class="tag-group">
            <span class="category-tag">Single Card</span>
            <span class="product-price-tag">${priceDisplay}</span>
        </div>
    </div>
    ${actionHtml}
    <div class="product-details">
        <div class="stock-badge ${stockClass}">${stockStatus}</div>
        <h3 class="product-title">${name}</h3>
    </div>
`;
    return div;
}
