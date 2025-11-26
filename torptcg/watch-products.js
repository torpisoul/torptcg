const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const productsDir = path.join(__dirname, 'products');

console.log('👀 Watching for product changes...');

// Initial build
try {
    execSync('node build-products.js', { stdio: 'inherit' });
} catch (error) {
    console.error('Error during initial build:', error);
}

// Watch for changes
fs.watch(productsDir, { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith('.md')) {
        console.log(`\n📝 Detected change in ${filename}`);
        console.log('🔄 Rebuilding products...');
        try {
            execSync('node build-products.js', { stdio: 'inherit' });
        } catch (error) {
            console.error('Error rebuilding products:', error);
        }
    }
});

console.log('✅ Watching products directory for changes...\n');
