// Supabase Client - Authentication and Database Access
// This file initializes the Supabase client for use throughout the application

// Note: In production, these should come from environment variables
// For now, they'll be loaded from a config or set during build

let supabaseClient = null;

// Initialize Supabase client
function initSupabase(supabaseUrl, supabaseAnonKey) {
    if (!window.supabase) {
        console.error('Supabase library not loaded. Include the CDN script first.');
        return null;
    }

    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    console.log('[SUPABASE] Client initialized');
    return supabaseClient;
}

// Get current Supabase client
function getSupabase() {
    if (!supabaseClient) {
        console.warn('[SUPABASE] Client not initialized. Call initSupabase() first.');
    }
    return supabaseClient;
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

// Sign up new user
async function signUp(email, password, metadata = {}) {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not initialized' };

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata // Additional user metadata
            }
        });

        if (error) throw error;
        console.log('[AUTH] User signed up:', data.user?.email);
        return { data, error: null };
    } catch (error) {
        console.error('[AUTH] Sign up error:', error);
        return { data: null, error };
    }
}

// Sign in existing user
async function signIn(email, password) {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not initialized' };

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        console.log('[AUTH] User signed in:', data.user?.email);
        return { data, error: null };
    } catch (error) {
        console.error('[AUTH] Sign in error:', error);
        return { data: null, error };
    }
}

// Sign out current user
async function signOut() {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not initialized' };

    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        console.log('[AUTH] User signed out');
        return { error: null };
    } catch (error) {
        console.error('[AUTH] Sign out error:', error);
        return { error };
    }
}

// Get current user
async function getCurrentUser() {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch (error) {
        console.error('[AUTH] Get user error:', error);
        return null;
    }
}

// Listen for auth state changes
function onAuthStateChange(callback) {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('[AUTH] State changed:', event);
        callback(event, session);
    });

    return subscription;
}

// ============================================
// WISHLIST FUNCTIONS
// ============================================

// Add item to wishlist
async function addToWishlist(productId, productType, notes = '', priority = 0) {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not initialized' };

    const user = await getCurrentUser();
    if (!user) return { error: 'User not authenticated' };

    try {
        const { data, error } = await supabase
            .from('wishlists')
            .insert([{
                user_id: user.id,
                product_id: productId,
                product_type: productType,
                notes: notes,
                priority: priority
            }])
            .select();

        if (error) throw error;
        console.log('[WISHLIST] Item added:', productId);
        return { data, error: null };
    } catch (error) {
        console.error('[WISHLIST] Add error:', error);
        return { data: null, error };
    }
}

// Remove item from wishlist
async function removeFromWishlist(productId) {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not initialized' };

    const user = await getCurrentUser();
    if (!user) return { error: 'User not authenticated' };

    try {
        const { error } = await supabase
            .from('wishlists')
            .delete()
            .eq('user_id', user.id)
            .eq('product_id', productId);

        if (error) throw error;
        console.log('[WISHLIST] Item removed:', productId);
        return { error: null };
    } catch (error) {
        console.error('[WISHLIST] Remove error:', error);
        return { error };
    }
}

// Get user's wishlist
async function getWishlist() {
    const supabase = getSupabase();
    if (!supabase) return { data: [], error: 'Supabase not initialized' };

    const user = await getCurrentUser();
    if (!user) return { data: [], error: 'User not authenticated' };

    try {
        const { data, error } = await supabase
            .from('wishlists')
            .select('*')
            .eq('user_id', user.id)
            .order('added_at', { ascending: false });

        if (error) throw error;
        console.log('[WISHLIST] Fetched', data?.length || 0, 'items');
        return { data, error: null };
    } catch (error) {
        console.error('[WISHLIST] Fetch error:', error);
        return { data: [], error };
    }
}

// Check if product is in wishlist
async function isInWishlist(productId) {
    const supabase = getSupabase();
    if (!supabase) return false;

    const user = await getCurrentUser();
    if (!user) return false;

    try {
        const { data, error } = await supabase
            .from('wishlists')
            .select('id')
            .eq('user_id', user.id)
            .eq('product_id', productId)
            .single();

        return !error && data !== null;
    } catch (error) {
        return false;
    }
}

// ============================================
// USER PREFERENCES FUNCTIONS
// ============================================

// Get user preferences
async function getUserPreferences() {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase not initialized' };

    const user = await getCurrentUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    try {
        const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code === 'PGRST116') {
            // No preferences yet, create default
            return await createDefaultPreferences(user.id);
        }

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('[PREFERENCES] Fetch error:', error);
        return { data: null, error };
    }
}

// Create default preferences
async function createDefaultPreferences(userId) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase not initialized' };

    try {
        const { data, error } = await supabase
            .from('user_preferences')
            .insert([{
                user_id: userId,
                email_notifications: true,
                price_alert_notifications: true,
                restock_notifications: true,
                favorite_domains: []
            }])
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('[PREFERENCES] Create error:', error);
        return { data: null, error };
    }
}

// Update user preferences
async function updateUserPreferences(preferences) {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not initialized' };

    const user = await getCurrentUser();
    if (!user) return { error: 'User not authenticated' };

    try {
        const { data, error } = await supabase
            .from('user_preferences')
            .update({
                ...preferences,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;
        console.log('[PREFERENCES] Updated');
        return { data, error: null };
    } catch (error) {
        console.error('[PREFERENCES] Update error:', error);
        return { data: null, error };
    }
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initSupabase,
        getSupabase,
        signUp,
        signIn,
        signOut,
        getCurrentUser,
        onAuthStateChange,
        addToWishlist,
        removeFromWishlist,
        getWishlist,
        isInWishlist,
        getUserPreferences,
        updateUserPreferences
    };
}
