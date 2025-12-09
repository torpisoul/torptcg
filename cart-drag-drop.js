// ============================================
// DRAG AND DROP SHOPPING CART
// ============================================

let cartCount = 0;
let draggedProduct = null;

// Initialize drag and drop functionality
function initDragAndDrop() {
    const cartIcon = document.getElementById('shopping-cart-icon');
    const cartBadge = document.getElementById('cart-badge');
    const cartTooltip = document.getElementById('cart-tooltip');

    if (!cartIcon) return;

    // Make all product cards draggable
    document.addEventListener('mousedown', handleCardMouseDown);
    document.addEventListener('touchstart', handleCardTouchStart, { passive: false });

    // Set up drop zone on cart icon
    cartIcon.addEventListener('dragover', handleDragOver);
    cartIcon.addEventListener('drop', handleDrop);
    cartIcon.addEventListener('dragleave', handleDragLeave);
}

// Handle mouse down on product card
function handleCardMouseDown(e) {
    const card = e.target.closest('.product-card');
    if (!card) return;

    const productId = card.getAttribute('data-product-id');
    if (!productId) return;

    // Make card draggable
    card.setAttribute('draggable', 'true');

    // Set up drag events
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
}

// Handle touch start for mobile
function handleCardTouchStart(e) {
    const card = e.target.closest('.product-card');
    if (!card) return;

    const productId = card.getAttribute('data-product-id');
    if (!productId) return;

    // Show tooltip and jiggle cart
    showCartTooltipAndJiggle();
}

// Handle drag start
function handleDragStart(e) {
    const card = e.currentTarget;
    const productId = card.getAttribute('data-product-id');

    draggedProduct = productId;
    card.classList.add('dragging');

    // Set drag data
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', productId);

    // Show tooltip and jiggle cart
    showCartTooltipAndJiggle();
}

// Handle drag end
function handleDragEnd(e) {
    const card = e.currentTarget;
    card.classList.remove('dragging');

    // Hide tooltip
    hideCartTooltip();

    // Remove draggable attribute
    card.removeAttribute('draggable');
    card.removeEventListener('dragstart', handleDragStart);
    card.removeEventListener('dragend', handleDragEnd);
}

// Handle drag over cart icon
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    const cartIcon = document.getElementById('shopping-cart-icon');
    cartIcon.classList.add('drop-zone-active');
}

// Handle drag leave cart icon
function handleDragLeave(e) {
    const cartIcon = document.getElementById('shopping-cart-icon');
    cartIcon.classList.remove('drop-zone-active');
}

// Handle drop on cart icon
async function handleDrop(e) {
    e.preventDefault();

    const cartIcon = document.getElementById('shopping-cart-icon');
    cartIcon.classList.remove('drop-zone-active');

    const productId = e.dataTransfer.getData('text/plain');

    if (productId) {
        // Add to cart using existing logic
        await handleAddToCart(productId);

        // Update cart count
        updateCartCount();

        // Hide tooltip
        hideCartTooltip();
    }
}

// Show cart tooltip and jiggle animation
function showCartTooltipAndJiggle() {
    const cartIcon = document.getElementById('shopping-cart-icon');
    const cartTooltip = document.getElementById('cart-tooltip');

    if (cartIcon && cartTooltip) {
        cartIcon.classList.add('jiggle');
        cartTooltip.classList.add('show');

        // Remove jiggle after animation
        setTimeout(() => {
            cartIcon.classList.remove('jiggle');
        }, 600);
    }
}

// Hide cart tooltip
function hideCartTooltip() {
    const cartTooltip = document.getElementById('cart-tooltip');
    if (cartTooltip) {
        cartTooltip.classList.remove('show');
    }
}

// Update cart count
function updateCartCount() {
    cartCount++;
    const cartBadge = document.getElementById('cart-badge');
    if (cartBadge) {
        cartBadge.textContent = cartCount;
        cartBadge.classList.remove('hidden');

        // Add pulse animation
        cartBadge.style.animation = 'none';
        setTimeout(() => {
            cartBadge.style.animation = 'pulse 0.3s ease';
        }, 10);
    }
}

// Add pulse animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.3); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDragAndDrop);
} else {
    initDragAndDrop();
}

// Re-initialize after products are rendered
const originalRenderProductsForDrag = window.renderProducts;
if (originalRenderProductsForDrag) {
    window.renderProducts = function (...args) {
        const result = originalRenderProductsForDrag.apply(this, args);
        setTimeout(initDragAndDrop, 100);
        return result;
    };
}

const originalRenderProductsByCategoryForDrag = window.renderProductsByCategory;
if (originalRenderProductsByCategoryForDrag) {
    window.renderProductsByCategory = function (...args) {
        const result = originalRenderProductsByCategoryForDrag.apply(this, args);
        setTimeout(initDragAndDrop, 100);
        return result;
    };
}
