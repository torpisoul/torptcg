// basket-script.js
// Handles localStorage-based cart management

const BASKET_KEY = 'torptcg_basket';
const BASKET_EVENT = 'basket-updated';

class BasketManager {
    constructor() {
        this.cart = this.loadCart();
    }

    loadCart() {
        try {
            const data = localStorage.getItem(BASKET_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error loading basket:', e);
            return [];
        }
    }

    saveCart() {
        try {
            localStorage.setItem(BASKET_KEY, JSON.stringify(this.cart));
            this.notifyListeners();
        } catch (e) {
            console.error('Error saving basket:', e);
        }
    }

    notifyListeners() {
        window.dispatchEvent(new CustomEvent(BASKET_EVENT, { detail: { cart: this.cart, total: this.getTotalCount() } }));
    }

    // Add item to cart
    addItem(product, quantity = 1) {
        // Find if item already exists
        const existingItem = this.cart.find(item => item.id === product.id);

        if (existingItem) {
            existingItem.quantity += quantity;
            // Cap at stock limit if known?
            // We'll trust the caller or check stock before calling addItem
        } else {
            this.cart.push({
                id: product.id,
                title: product.title,
                price: product.price,
                image: product.image,
                quantity: quantity
            });
        }
        this.saveCart();
    }

    // Remove item completely
    removeItem(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.saveCart();
    }

    // Update quantity
    updateQuantity(productId, newQuantity) {
        if (newQuantity <= 0) {
            this.removeItem(productId);
            return;
        }

        const item = this.cart.find(item => item.id === productId);
        if (item) {
            item.quantity = newQuantity;
            this.saveCart();
        }
    }

    // Clear cart
    clearCart() {
        this.cart = [];
        this.saveCart();
    }

    // Get cart contents
    getCart() {
        return this.cart;
    }

    // Get total items count
    getTotalCount() {
        return this.cart.reduce((sum, item) => sum + item.quantity, 0);
    }

    // Get total price
    getTotalPrice() {
        return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
}

// Export singleton
window.basketManager = new BasketManager();

// Helper functions for UI
function renderBasketModal() {
    const cart = window.basketManager.getCart();
    const container = document.getElementById('basket-items-container');
    const totalElement = document.getElementById('basket-total-price');
    const checkoutBtn = document.getElementById('btn-checkout');

    if (!container) return;

    container.innerHTML = '';

    if (cart.length === 0) {
        container.innerHTML = '<div class="basket-empty">Your basket is empty.</div>';
        if (totalElement) totalElement.textContent = '£0.00';
        if (checkoutBtn) checkoutBtn.disabled = true;
        return;
    }

    cart.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'basket-item';
        itemEl.innerHTML = `
            <div class="basket-item-image">
                <img src="${item.image}" alt="${item.title}">
            </div>
            <div class="basket-item-details">
                <div class="basket-item-title">${item.title}</div>
                <div class="basket-item-price">£${item.price.toFixed(2)}</div>
            </div>
            <div class="basket-item-controls">
                <button class="btn-qty" onclick="basketManager.updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                <span class="basket-item-qty">${item.quantity}</span>
                <button class="btn-qty" onclick="basketManager.updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                <button class="btn-remove" onclick="basketManager.removeItem('${item.id}')" title="Remove">&times;</button>
            </div>
        `;
        container.appendChild(itemEl);
    });

    if (totalElement) {
        totalElement.textContent = `£${window.basketManager.getTotalPrice().toFixed(2)}`;
    }

    if (checkoutBtn) {
        checkoutBtn.disabled = false;
    }
}

function openBasketModal() {
    renderBasketModal();
    const modal = document.getElementById('basket-modal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
        document.body.style.overflow = 'hidden';
    }
}

function closeBasketModal() {
    const modal = document.getElementById('basket-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
        document.body.style.overflow = '';
    }
}

// Initialize listeners
window.addEventListener(BASKET_EVENT, () => {
    // Update badge if exists
    const badge = document.getElementById('basket-count-badge');
    if (badge) {
        const count = window.basketManager.getTotalCount();
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
    // Re-render if modal is open
    const modal = document.getElementById('basket-modal');
    if (modal && modal.style.display !== 'none') {
        renderBasketModal();
    }
});

async function handleCheckout() {
    const checkoutBtn = document.getElementById('btn-checkout');
    if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Processing...';
    }

    try {
        const cart = window.basketManager.getCart();

        const response = await fetch('/.netlify/functions/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart })
        });

        const data = await response.json();

        if (response.ok && data.url) {
            window.location.href = data.url;
        } else {
            console.error('Checkout error:', data);
            alert(`Checkout failed: ${data.error || 'Unknown error'}`);
            if (checkoutBtn) {
                checkoutBtn.disabled = false;
                checkoutBtn.textContent = 'Checkout';
            }
        }
    } catch (e) {
        console.error('Checkout exception:', e);
        alert('An error occurred during checkout. Please try again.');
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = 'Checkout';
        }
    }
}

// Expose functions globally
window.openBasketModal = openBasketModal;
window.closeBasketModal = closeBasketModal;
window.handleCheckout = handleCheckout;
