// Initialize Hero Animation
document.addEventListener('DOMContentLoaded', () => {
    initHeroAnimation();
});

async function initHeroAnimation() {
    const container = document.getElementById('hero-background-animation');
    if (!container) return;

    // Fetch products to get images
    let products = [];
    try {
        products = await fetchProducts();
    } catch (e) {
        console.warn('Failed to load products for animation, using simplified shapes');
    }

    // Filter for singles/cards as they look best floating
    const cardProducts = products.filter(p => p.category === 'singles' && p.image);

    // Create floating elements
    const count = 8; // Number of floating items

    for (let i = 0; i < count; i++) {
        const floater = document.createElement('div');
        floater.className = 'hero-floater';

        // Randomly pick a card image if available
        if (cardProducts.length > 0) {
            const product = cardProducts[Math.floor(Math.random() * cardProducts.length)];
            floater.style.backgroundImage = `url('${product.image}')`;
        } else {
            // Fallback gradient
            floater.classList.add('fallback-floater');
        }

        // Randomize initial position and animation properties
        const startX = Math.random() * 100;
        const startY = Math.random() * 100;
        const duration = 15 + Math.random() * 20; // 15-35s duration
        const delay = Math.random() * -20; // Start at different times
        const scale = 0.5 + Math.random() * 0.5; // 0.5-1.0 scale

        floater.style.left = `${startX}%`;
        floater.style.top = `${startY}%`;
        floater.style.animationDuration = `${duration}s`;
        floater.style.animationDelay = `${delay}s`;
        floater.style.transform = `scale(${scale})`;

        container.appendChild(floater);
    }
}
