// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
  });
}

// Supabase Configuration
const SUPABASE_URL = 'https://ukkhhhmjblzyuazumqpt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_u0xqV1xW9zPwzWtqGn86_Q_TA0_FNrn';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const _supabase = supabaseClient; // Alias for _supabase
window._supabase = _supabase;


// Application State
let cart = [];
let menuFlavors = [];
let activeCategory = 'All';
let currentUser = null; // Supabase auth user object


// Store Availability State Listener
function updateStoreState(isOnline) {
  const offlineBanner = document.getElementById('store-offline-banner');
  const checkoutBtns = document.querySelectorAll('#checkout-btn, #float-checkout-btn');
  
  if (!isOnline) {
    offlineBanner?.classList.remove('hidden');
    checkoutBtns.forEach(btn => {
      btn.disabled = true;
      btn.classList.add('opacity-50', 'cursor-not-allowed');
    });
  } else {
    offlineBanner?.classList.add('hidden');
    checkoutBtns.forEach(btn => {
      btn.disabled = false;
      btn.classList.remove('opacity-50', 'cursor-not-allowed');
    });
  }
}

// Fetch store status on load and subscribe to real-time changes
async function initStoreStatusListener() {
  // Initial fetch
  const { data } = await supabaseClient.from('store_settings').select('is_online').eq('id', 1).single();
  if (data) {
    updateStoreState(data.is_online);
  }

  // Real-time listener
  supabaseClient
    .channel('public:store_settings')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'store_settings' }, payload => {
      if (payload.new) {
        updateStoreState(payload.new.is_online);
      }
    })
    .subscribe();
}

initStoreStatusListener();

// UI Selectors
const cartToggleBtn = document.getElementById('cart-toggle-btn');
const cartCloseBtn = document.getElementById('cart-close-btn');
const cartOverlay = document.getElementById('cart-overlay');
const cartDrawer = document.getElementById('cart-drawer');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartCountBadge = document.getElementById('cart-count-badge');
const cartDrawerCount = document.getElementById('cart-drawer-count');
const cartSubtotal = document.getElementById('cart-subtotal');
const cartTaxes = document.getElementById('cart-taxes');
const cartTotal = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');

const checkoutModal = document.getElementById('checkout-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const orderForm = document.getElementById('order-form');
const submitOrderBtn = document.getElementById('submit-order-btn');
const checkoutError = document.getElementById('checkout-error');

const trackingModal = document.getElementById('tracking-modal');
const trackBtn = document.getElementById('track-modal-btn') || document.getElementById('track-order-nav');
const closeTrackBtn = document.getElementById('close-tracking-btn');
const popSound = document.getElementById('pop-sound');

// Play Pop Sound Effect
function playPop() {
  if (popSound) {
    popSound.currentTime = 0;
    popSound.play().catch(() => {});
  }
}

// Generate Continuous Carbonation Bubbles inside the Bottle Area
function startCarbonationEffect() {
  const container = document.getElementById('bubble-container');
  if (!container) return;

  setInterval(() => {
    const bubble = document.createElement('div');
    bubble.classList.add('bubble');
    
    // Randomize size, starting horizontal position, and speed
    const size = Math.random() * 8 + 4 + 'px';
    const left = Math.random() * 80 + 10 + '%';
    const duration = Math.random() * 1.5 + 1.5 + 's';

    bubble.style.width = size;
    bubble.style.height = size;
    bubble.style.left = left;
    bubble.style.bottom = '10%';
    bubble.style.animationDuration = duration;

    container.appendChild(bubble);

    // Clean up bubble element after animation ends
    setTimeout(() => {
      bubble.remove();
    }, 2500);
  }, 200);
}

// Array of different pop audio IDs
const popSounds = ['soda-pop-1', 'soda-pop-2', 'soda-pop-3'];

// Pop Bottle Animation Logic
function popSodaBottle(element) {
  const bottle = (element && element.querySelector ? element.querySelector('img') : null) || 
                 document.getElementById('sodaBottle') || 
                 document.getElementById('hero-soda-bottle');
  const fizz = document.getElementById('fizzEffect');

  // Trigger sound
  const randomSoundId = popSounds[Math.floor(Math.random() * popSounds.length)];
  const audio = document.getElementById(randomSoundId);
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(err => console.log('Audio playback issue:', err));
  }

  // Trigger Fizz particles
  if (fizz) {
    fizz.classList.remove('hidden');
    setTimeout(() => {
      fizz.classList.add('hidden');
    }, 1200);
  }

  // Shake / Ping animation
  if (bottle) {
    bottle.classList.add('animate-ping');
    setTimeout(() => {
      bottle.classList.remove('animate-ping');
    }, 300);
  }

  // Burst carbonation bubbles upwards
  const container = document.getElementById('bubble-container') || document.getElementById('bottleContainer');
  if (container) {
    for (let i = 0; i < 15; i++) {
      const bubble = document.createElement('div');
      bubble.classList.add('bubble');
      const size = Math.random() * 10 + 4 + 'px';
      bubble.style.width = size;
      bubble.style.height = size;
      bubble.style.left = Math.random() * 70 + 15 + '%';
      bubble.style.bottom = '15%';
      bubble.style.animationDuration = Math.random() * 0.8 + 0.7 + 's';
      container.appendChild(bubble);

      setTimeout(() => bubble.remove(), 1200);
    }
  }
}

// Order & Supabase Checkout Function
async function checkoutOrder(flavor, price) {
  // Support both currentUser and Supabase v2 getUser()
  let userEmail = "guest@kickgolisoda.com";
  try {
    if (currentUser?.email) {
      userEmail = currentUser.email;
    } else if (_supabase?.auth?.getUser) {
      const { data } = await _supabase.auth.getUser();
      if (data?.user?.email) userEmail = data.user.email;
    }
  } catch (e) {
    console.warn('User session check skipped:', e);
  }

  popSodaBottle();

  try {
    const response = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_email: userEmail,
        flavor: flavor,
        quantity: 1,
        total_price: price
      })
    });

    const result = await response.json();
    if (response.ok) {
      if (typeof showToast === 'function') {
        showToast(`🎉 Order Confirmed! Enjoy your ${flavor}.`, 'success');
      } else {
        alert(`🎉 Order Confirmed! Enjoy your ${flavor}.`);
      }
    } else {
      if (typeof showToast === 'function') {
        showToast(`Error: ${result.error}`, 'error');
      } else {
        alert(`Error: ${result.error}`);
      }
    }
  } catch (err) {
    console.error("Checkout failed:", err);
    if (typeof showToast === 'function') {
      showToast('Checkout failed: Could not connect to order server.', 'error');
    } else {
      alert("Checkout failed: Could not connect to order server.");
    }
  }
}

// Initialize Carbonation on Page Load
document.addEventListener('DOMContentLoaded', startCarbonationEffect);


// Toast Notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  // Create toast card element
  const toast = document.createElement('div');
  const isSuccess = type === 'success';
  const isInfo = type === 'info';
  
  toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl transition transform duration-300 translate-y-[-10px] opacity-0 ${
    isSuccess 
      ? 'bg-zinc-900 border-emerald-500/50 text-emerald-400 shadow-emerald-500/10' 
      : isInfo
        ? 'bg-zinc-900 border-cyan-500/50 text-cyan-400 shadow-cyan-500/10'
        : 'bg-zinc-900 border-red-500/50 text-red-400 shadow-red-500/10'
  }`;

  const icon = isSuccess ? '🎉' : isInfo ? 'ℹ️' : '⚠️';

  toast.innerHTML = `
    <span class="text-xl">${icon}</span>
    <p class="text-sm font-semibold text-white">${message}</p>
  `;

  container.appendChild(toast);

  // Trigger smooth drop-in transition
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-[-10px]', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  // Auto remove after 3.5 seconds
  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-[-10px]', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Cart Drawer & Modal Controls
function toggleCart(open) {
  if (open) {
    cartOverlay.classList.remove('hidden');
    cartDrawer.classList.remove('translate-x-full');
  } else {
    cartOverlay.classList.add('hidden');
    cartDrawer.classList.add('translate-x-full');
  }
}

/** Open checkout drawer/modal directly */
function openCheckoutModal() {
  toggleCart(true);
}

cartToggleBtn.addEventListener('click', () => toggleCart(true));
cartCloseBtn.addEventListener('click', () => toggleCart(false));
cartOverlay.addEventListener('click', () => toggleCart(false));

// Tracking Modal Controls
function openTrackOrderModal() {
  trackingModal?.classList.remove('hidden');
}

if (closeTrackBtn) {
  closeTrackBtn.addEventListener('click', () => trackingModal.classList.add('hidden'));
}

// Toggle Profile Modal
function toggleProfileModal() {
  const modal = document.getElementById('profile-modal');
  modal?.classList.toggle('hidden');
}

// ─── EMAIL & PASSWORD AUTH (Supabase) ─────────────────────────────────────────

let currentAuthMode = 'signin';

/** Open the authentication modal */
function openAuthModal() {
  const modal = document.getElementById('authModal') || document.getElementById('auth-modal');
  modal?.classList.remove('hidden');
}

/** Close the authentication modal */
function closeAuthModal() {
  const modal = document.getElementById('authModal') || document.getElementById('auth-modal');
  modal?.classList.add('hidden');
  const emailInput = document.getElementById('authEmail') || document.getElementById('auth-email');
  const passInput = document.getElementById('authPassword') || document.getElementById('auth-password');
  const toggleBtn = document.getElementById('togglePasswordBtn');
  if (emailInput) emailInput.value = '';
  if (passInput) {
    passInput.value = '';
    passInput.type = 'password';
  }
  if (toggleBtn) toggleBtn.textContent = '👁️';
}

/** Toggle auth password field visibility between text and password */
function togglePasswordVisibility() {
  const passInput = document.getElementById('authPassword') || document.getElementById('auth-password');
  const toggleBtn = document.getElementById('togglePasswordBtn');
  if (!passInput) return;

  if (passInput.type === 'password') {
    passInput.type = 'text';
    if (toggleBtn) toggleBtn.textContent = '🙈';
  } else {
    passInput.type = 'password';
    if (toggleBtn) toggleBtn.textContent = '👁️';
  }
}

/** Switch modal between 'signin' and 'signup' modes */
function setAuthMode(mode) {
  currentAuthMode = mode;
  const title = document.getElementById('auth-modal-title');
  const subtitle = document.getElementById('auth-modal-subtitle');
  const submitBtn = document.getElementById('auth-submit-btn');
  const tabSignIn = document.getElementById('auth-tab-signin');
  const tabSignUp = document.getElementById('auth-tab-signup');

  if (mode === 'signup') {
    if (title) title.textContent = 'Create an Account';
    if (subtitle) subtitle.textContent = 'Join Kick Goli Soda for faster checkout & order tracking';
    if (submitBtn) submitBtn.textContent = 'Create Account';

    tabSignUp?.classList.remove('text-zinc-400', 'hover:text-zinc-200');
    tabSignUp?.classList.add('bg-emerald-500', 'text-zinc-950');

    tabSignIn?.classList.remove('bg-emerald-500', 'text-zinc-950');
    tabSignIn?.classList.add('text-zinc-400', 'hover:text-zinc-200');
  } else {
    if (title) title.textContent = 'Sign In to Kick Goli Soda';
    if (subtitle) subtitle.textContent = 'Manage orders, track deliveries, and save preferences';
    if (submitBtn) submitBtn.textContent = 'Sign In';

    tabSignIn?.classList.remove('text-zinc-400', 'hover:text-zinc-200');
    tabSignIn?.classList.add('bg-emerald-500', 'text-zinc-950');

    tabSignUp?.classList.remove('bg-emerald-500', 'text-zinc-950');
    tabSignUp?.classList.add('text-zinc-400', 'hover:text-zinc-200');
  }
}

/** Handle Auth Form Submission */
async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email')?.value.trim();
  const password = document.getElementById('auth-password')?.value;

  const submitBtn = document.getElementById('auth-submit-btn');
  const originalText = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = currentAuthMode === 'signup' ? 'Creating Account...' : 'Signing In...';
  }

  try {
    if (currentAuthMode === 'signup') {
      await signUpUser(email, password);
    } else {
      await signInUser(email, password);
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }
}

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Sign Up Handler
async function signUpUser(email, password) {
  if (!email || !password) {
    showToast('Please enter both email and password', 'error');
    return;
  }

  if (!isValidEmail(email)) {
    showToast("Please enter a proper email address (e.g., name@domain.com)", "error");
    return;
  }

  if (password.length < 6) {
    showToast("Password must be at least 6 characters long", "error");
    return;
  }

  const { data, error } = await _supabase.auth.signUp({
    email: email,
    password: password
  });

  if (error) {
    console.error('Sign up error:', error.message);
    showToast(`Sign up failed: ${error.message}`, "error");
  } else {
    showToast("Account created successfully! You can now Sign In.", "success");
    closeAuthModal();
  }
}

// Sign In Handler
async function signInUser(email, password) {
  if (!email || !password) {
    showToast('Please enter both email and password', 'error');
    return;
  }

  const { data, error } = await _supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    console.error('Login error:', error.message);
    showToast('Login failed: ' + error.message, 'error');
  } else {
    showToast('Successfully logged in!', 'success');
    closeAuthModal();
  }
}

// Sign Out Handler
async function signOutUser() {
  const { error } = await _supabase.auth.signOut();
  if (error) {
    showToast('Error signing out: ' + error.message, 'error');
  } else {
    currentUser = null;
    renderAuthButton(null);
    renderUserProfile();
    showToast('Signed out successfully', 'info');
    document.getElementById('profile-modal')?.classList.add('hidden');
    document.getElementById('auth-dropdown')?.remove();
  }
}

/**
 * Render the navbar auth button based on session state.
 * @param {object|null} user - Supabase user object or null if logged out
 */
function renderAuthButton(user) {
  const container = document.getElementById('auth-container');
  if (!container) return;

  if (!user) {
    // ── Logged-out: Email / Password Sign In button ──
    container.innerHTML = `
      <button
        id="openAuthBtn"
        onclick="openAuthModal()"
        class="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-md"
      >
        <span>👤</span>
        <span>Sign In / Register</span>
      </button>
    `;
  } else {
    // ── Logged-in: Avatar + first name + dropdown toggle ──
    const avatarUrl = user.user_metadata?.avatar_url || '';
    const firstName  = (user.user_metadata?.full_name || user.email || 'User').split(' ')[0];
    const avatarHTML = avatarUrl
      ? `<img src="${avatarUrl}" alt="avatar" class="w-6 h-6 rounded-full object-cover border border-emerald-500/40">`
      : `<span class="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xs font-bold">${firstName[0].toUpperCase()}</span>`;

    container.innerHTML = `
      <button
        id="user-auth-btn"
        onclick="toggleAuthDropdown()"
        class="flex flex-col items-start hover:text-emerald-400 text-zinc-300 transition text-left"
      >
        <span class="text-[10px] text-zinc-400">Signed in as</span>
        <span class="font-bold flex items-center gap-1.5">
          ${avatarHTML}
          ${firstName}
          <svg class="w-3 h-3 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </span>
      </button>
      <div id="auth-dropdown" class="hidden absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-50">
        <button onclick="toggleProfileModal(); toggleAuthDropdown()" class="w-full flex items-center gap-2 px-4 py-3 text-xs text-zinc-200 hover:bg-zinc-800 transition text-left">
          <span>👤</span> My Profile
        </button>
        <div class="border-t border-zinc-800"></div>
        <button onclick="signOutUser()" class="w-full flex items-center gap-2 px-4 py-3 text-xs text-rose-400 hover:bg-rose-500/10 transition text-left">
          <span>↩️</span> Sign Out
        </button>
      </div>
    `;
  }
}

/** Toggle the sign-in dropdown visible/hidden */
function toggleAuthDropdown() {
  const dropdown = document.getElementById('auth-dropdown');
  if (!dropdown) return;
  dropdown.classList.toggle('hidden');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const container = document.getElementById('auth-container');
  if (container && !container.contains(e.target)) {
    document.getElementById('auth-dropdown')?.classList.add('hidden');
  }
});

// ── Supabase Auth State Listener ─────────────────────────────────────────────
supabaseClient.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user || null;
  renderAuthButton(currentUser);
  renderUserProfile();
});

// Bootstrap auth on page load
async function initAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  currentUser = session?.user || null;
  renderAuthButton(currentUser);
  renderUserProfile();
}

initAuth();
document.addEventListener('DOMContentLoaded', initAuth);
// ─────────────────────────────────────────────────────────────────────────────


document.getElementById('search-track-btn')?.addEventListener('click', () => {
  const query = document.getElementById('track-input').value.trim();
  const resultContainer = document.getElementById('tracking-result');
  
  if (!query) return;

  // Render dummy data or replace with your Supabase query
  document.getElementById('res-order-id').textContent = query.startsWith('#') ? query : '#1084';
  document.getElementById('res-status').textContent = 'Out for Delivery 🛵';
  resultContainer.classList.remove('hidden');
});

// Checkout Modal Visibility
checkoutBtn.addEventListener('click', () => {
  toggleCart(false);
  checkoutModal.classList.remove('hidden');
});
modalCloseBtn.addEventListener('click', () => checkoutModal.classList.add('hidden'));

// Flavor Filtering
function filterFlavors(category) {
  activeCategory = category;
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    if (btn.textContent.toUpperCase() === category || (category === 'All' && btn.textContent === 'All')) {
      btn.className = 'filter-btn bg-emerald-500 text-zinc-950 font-bold px-4 py-1.5 rounded-full text-xs transition';
    } else {
      btn.className = 'filter-btn bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white font-semibold px-4 py-1.5 rounded-full text-xs transition';
    }
  });
  const filtered = activeCategory === 'All'
    ? menuFlavors
    : menuFlavors.filter(f => f.category && f.category.toUpperCase() === activeCategory);
  renderFlavors(filtered);
}

// Render Flavors as Cards
function renderFlavors(flavors) {
  const container = document.getElementById('flavor-grid');
  const status = document.getElementById('status-indicator');
  if (!container) return;

  if (status) status.textContent = `${flavors.length} flavors shown`;

  if (flavors.length === 0) {
    container.innerHTML = `<p class="text-zinc-400 col-span-full py-8 text-center">No flavors found in this category.</p>`;
    return;
  }

  container.innerHTML = flavors.map(flavor => `
    <div class="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/50 transition duration-300 shadow-xl backdrop-blur-sm group">
      <div>
        <div class="relative overflow-hidden rounded-xl mb-4 bg-zinc-950 aspect-square flex items-center justify-center">
          <img src="${flavor.image_url || ''}" alt="${flavor.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
          <span class="absolute top-2 right-2 bg-zinc-950/80 border border-zinc-800 text-emerald-400 font-black text-xs px-2.5 py-1 rounded-lg backdrop-blur-md">
            ₹${flavor.price}
          </span>
          ${flavor.is_available === false ? '<span class="absolute inset-0 bg-zinc-950/70 flex items-center justify-center"><span class="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">Out of Stock</span></span>' : ''}
        </div>
        <h4 class="font-bold text-white text-base mb-1">${flavor.name}</h4>
        <p class="text-xs text-zinc-400 leading-relaxed mb-4">${flavor.description || 'Authentic handcrafted goli soda.'}</p>
      </div>

      <button
        onclick="${flavor.is_available !== false ? `addToCart(${flavor.id})` : ''}"
        ${flavor.is_available === false ? 'disabled' : ''}
        class="w-full ${flavor.is_available !== false ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/10' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'} font-black py-2.5 rounded-xl text-xs transition">
        ${flavor.is_available !== false ? '+ Add to Cart' : 'Sold Out'}
      </button>
    </div>
  `).join('');
}

// Cart State Operations
function addToCart(flavorId) {
  playPop();
  const item = menuFlavors.find(f => f.id === flavorId);
  if (!item) return;

  const existingIndex = cart.findIndex(c => c.id === flavorId);
  if (existingIndex > -1) {
    cart[existingIndex].quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }

  updateCartUI();
  toggleCart(true);
}

function updateQuantity(flavorId, change) {
  const index = cart.findIndex(c => c.id === flavorId);
  if (index === -1) return;

  cart[index].quantity += change;
  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }

  updateCartUI();
}

function updateCartUI() {
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxes = subtotal > 0 ? Math.round(subtotal * 0.05) : 0;
  const grandTotal = subtotal + taxes;

  if (cartCountBadge) cartCountBadge.textContent = totalCount;
  const miniCartBadge = document.getElementById('cart-badge');
  if (miniCartBadge) miniCartBadge.textContent = totalCount;
  if (cartDrawerCount) cartDrawerCount.textContent = `${totalCount} item${totalCount === 1 ? '' : 's'}`;
  
  cartSubtotal.textContent = `₹${subtotal}`;
  cartTaxes.textContent = `₹${taxes}`;
  cartTotal.textContent = `₹${grandTotal}`;

  updateFloatingCartBar(totalCount, grandTotal);

  checkoutBtn.disabled = cart.length === 0;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `<p class="text-zinc-500 text-center py-12">Your cart is empty. Pick a soda!</p>`;
    return;
  }

  cartItemsContainer.innerHTML = cart.map(item => `
    <div class="py-4 flex justify-between items-center gap-4">
      <div class="flex-1">
        <h4 class="font-bold text-white text-sm">${item.name}</h4>
        <p class="text-xs text-zinc-400">₹${item.price} each</p>
      </div>
      <div class="flex items-center gap-2 bg-zinc-800 rounded-lg px-2 py-1 border border-zinc-700">
        <button onclick="updateQuantity(${item.id}, -1)" class="text-zinc-400 hover:text-white text-base font-bold w-5 h-5 flex items-center justify-center">-</button>
        <span class="text-xs font-bold text-white px-1">${item.quantity}</span>
        <button onclick="updateQuantity(${item.id}, 1)" class="text-zinc-400 hover:text-white text-base font-bold w-5 h-5 flex items-center justify-center">+</button>
      </div>
      <span class="font-bold text-sm text-emerald-400">₹${item.price * item.quantity}</span>
    </div>
  `).join('');
}

// Temporary UPI Configuration (Update later with client's bank-linked VPA)
const UPI_ID = "kickgolisoda@upi"; 
const MERCHANT_NAME = "Kick Goli Soda";

function openUpiCheckout(totalAmount) {
  const upiUrl = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${totalAmount}&cu=INR`;
  const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`;

  document.getElementById('upi-qr-img').src = qrApi;
  document.getElementById('upi-amount').textContent = `₹${totalAmount}`;
  document.getElementById('upi-modal').classList.remove('hidden');
}

function closeUpiModal() {
  document.getElementById('upi-modal').classList.add('hidden');
}

async function confirmUpiPayment() {
  const utr = document.getElementById('upi-utr').value.trim();
  if (!utr) {
    alert('Please enter your 12-digit UTR or Transaction ID.');
    return;
  }

  window.currentOrderUTR = utr;
  closeUpiModal();
  if (typeof submitOrder === 'function') {
    await submitOrder();
  }
}

function showOrderReceipt(orderData) {
  document.getElementById('receipt-order-id').textContent = `#${orderData.id || 'SUCCESS'}`;
  document.getElementById('receipt-utr').textContent = orderData.utr_number || window.currentOrderUTR || 'N/A';
  document.getElementById('receipt-date').textContent = new Date().toLocaleString();
  document.getElementById('receipt-total').textContent = `₹${orderData.total_amount}`;

  const itemsContainer = document.getElementById('receipt-items-list');
  if (Array.isArray(orderData.items)) {
    itemsContainer.innerHTML = orderData.items.map(i => `
      <div class="flex justify-between">
        <span>${i.name} x${i.quantity}</span>
        <span class="font-mono">₹${i.price * i.quantity}</span>
      </div>
    `).join('');
  }

  document.getElementById('receipt-modal').classList.remove('hidden');
}

function closeReceiptModal() {
  document.getElementById('receipt-modal').classList.add('hidden');
}

// Order Submission
async function submitOrder() {
  submitOrderBtn.disabled = true;
  submitOrderBtn.textContent = 'Submitting Order...';
  checkoutError.classList.add('hidden');

  const name = document.getElementById('cust-name').value;
  const phone = document.getElementById('cust-phone').value;
  const address = document.getElementById('cust-address').value;

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const grandTotal = subtotal + (subtotal > 0 ? Math.round(subtotal * 0.05) : 0);

  try {
    const orderPayload = {
      customer_name: name,
      phone: phone,
      address: address,
      items: cart,
      total_amount: grandTotal
    };

    if (window.currentOrderUTR) {
      orderPayload.utr_number = window.currentOrderUTR;
    }

    const { data, error } = await supabaseClient
      .from('orders')
      .insert([orderPayload])
      .select();

    if (error) throw error;

    playPop();
    const createdOrder = (data && data.length > 0) ? data[0] : orderPayload;

    saveUserProfile(name, phone, address);

    showOrderReceipt(createdOrder);
    cart = [];
    window.currentOrderUTR = null;
    if (document.getElementById('upi-utr')) document.getElementById('upi-utr').value = '';
    updateCartUI();
    checkoutModal.classList.add('hidden');
    orderForm.reset();

  } catch (err) {
    console.error('Order submission error:', err);
    checkoutError.textContent = `Order Error: ${err.message || 'Could not insert into orders table.'}`;
    checkoutError.classList.remove('hidden');
  } finally {
    submitOrderBtn.disabled = false;
    submitOrderBtn.textContent = 'Confirm Order';
  }
}

orderForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const grandTotal = subtotal + (subtotal > 0 ? Math.round(subtotal * 0.05) : 0);
  openUpiCheckout(grandTotal);
});

// Live Order Tracking Search
async function trackOrder() {
  const input = document.getElementById('track-phone-input').value.trim();
  const resultsDiv = document.getElementById('track-results');

  if (!input) {
    alert('Please enter a phone number to search.');
    return;
  }

  resultsDiv.innerHTML = '<p class="text-xs text-zinc-400 animate-pulse">Searching live orders...</p>';
  resultsDiv.classList.remove('hidden');

  try {
    const { data: orders, error } = await supabaseClient
      .from('orders')
      .select('*')
      .ilike('phone', `%${input}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!orders || orders.length === 0) {
      resultsDiv.innerHTML = `<p class="text-xs text-amber-400 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">No orders found for this phone number.</p>`;
      return;
    }

    resultsDiv.innerHTML = orders.map(o => `
      <div class="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-1">
        <div class="flex justify-between items-center">
          <span class="font-mono text-xs text-emerald-400 font-bold">Order #${o.id}</span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded ${o.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}">${o.status}</span>
        </div>
        <p class="text-xs text-zinc-300 font-bold">Total: ₹${o.total_amount}</p>
        <p class="text-[10px] text-zinc-500">${new Date(o.created_at).toLocaleString()}</p>
      </div>
    `).join('');

  } catch (err) {
    resultsDiv.innerHTML = `<p class="text-xs text-red-400">Error: ${err.message}</p>`;
  }
}

// Fetch Flavors
async function fetchFlavors() {
  const status = document.getElementById('status-indicator');

  try {
    const { data, error } = await supabaseClient.from('flavors').select('*');
    if (error) throw error;

    menuFlavors = data || [];
    renderFlavors(menuFlavors);
  } catch (err) {
    console.error('Database connection error:', err);
    status.textContent = 'Connection Error';
  }
}

fetchFlavors();

// Floating Cart Visibility on Scroll
const floatingBar = document.getElementById('floating-cart-bar');
const menuSection = document.getElementById('menu');

window.addEventListener('scroll', () => {
  if (!menuSection || !floatingBar) return;
  const menuPosition = menuSection.getBoundingClientRect().top;
  
  // Show bar once scrolled past the top of the menu section
  if (menuPosition < window.innerHeight - 100) {
    floatingBar.classList.remove('translate-y-24', 'opacity-0');
  } else {
    floatingBar.classList.add('translate-y-24', 'opacity-0');
  }
});

// Helper function to call whenever cart updates
function updateFloatingCartBar(itemCount, totalPrice) {
  const totalElem = document.getElementById('float-cart-total');
  if (totalElem) {
    totalElem.textContent = `${itemCount} item${itemCount === 1 ? '' : 's'} • ₹${totalPrice}`;
  }
}

// Wire floating checkout button to open existing cart drawer
document.getElementById('float-checkout-btn')?.addEventListener('click', () => {
  const mainCartBtn = document.getElementById('cart-toggle-btn');
  mainCartBtn?.click();
});

// Save user profile details to localStorage on checkout
function saveUserProfile(name, phone, address) {
  const profile = { name, phone, address };
  localStorage.setItem('kick_user_profile', JSON.stringify(profile));
  renderUserProfile();
}

// Render profile info in Nav and Modal
function renderUserProfile() {
  const profileName = document.getElementById('profile-name');
  const profilePhone = document.getElementById('profile-phone');
  const profileAvatar = document.getElementById('profile-avatar-wrapper');
  const modalSignOutBtn = document.getElementById('profile-modal-signout-btn');
  const custNameInput = document.getElementById('cust-name');

  const saved = localStorage.getItem('kick_user_profile');
  const localProfile = saved ? JSON.parse(saved) : {};

  if (currentUser) {
    const fullName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || localProfile.name || 'Goli Soda Fan';
    const emailOrPhone = currentUser.email || localProfile.phone || '';
    const avatarUrl = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture;

    if (profileName) profileName.textContent = fullName;
    if (profilePhone) profilePhone.textContent = emailOrPhone;
    if (profileAvatar) {
      profileAvatar.innerHTML = avatarUrl 
        ? `<img src="${avatarUrl}" alt="Avatar" class="w-full h-full object-cover rounded-full" />`
        : `<span>👤</span>`;
    }
    if (modalSignOutBtn) modalSignOutBtn.classList.remove('hidden');
    if (custNameInput && !custNameInput.value && fullName !== 'Goli Soda Fan') {
      custNameInput.value = fullName;
    }
  } else {
    if (profileName) profileName.textContent = localProfile.name || 'Goli Soda Fan';
    if (profilePhone) profilePhone.textContent = localProfile.phone || '+91 96204 16948';
    if (profileAvatar) profileAvatar.innerHTML = '👤';
    if (modalSignOutBtn) modalSignOutBtn.classList.add('hidden');
  }
}

// Run on page load
document.addEventListener('DOMContentLoaded', renderUserProfile);

