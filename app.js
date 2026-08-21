// Supabase Configuration
const SUPABASE_URL = 'https://ukkhhhmjblzyuazumqpt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_u0xqV1xW9zPwzWtqGn86_Q_TA0_FNrn';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Application State
let cart = [];
let menuFlavors = [];
let activeCategory = 'All';

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

const trackModalBtn = document.getElementById('track-modal-btn');
const trackModal = document.getElementById('track-modal');
const trackCloseBtn = document.getElementById('track-close-btn');
const popSound = document.getElementById('pop-sound');

// Play Pop Sound Effect
function playPop() {
  if (popSound) {
    popSound.currentTime = 0;
    popSound.play().catch(() => {});
  }
}

// Toast Notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const isSuccess = type === 'success';

  toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold transform transition-all duration-300 translate-y-5 opacity-0 ${
    isSuccess 
      ? 'bg-zinc-900 text-emerald-400 border-emerald-500/30' 
      : 'bg-zinc-900 text-rose-400 border-rose-500/30'
  }`;

  toast.innerHTML = `
    <span>${isSuccess ? '✅' : '⚠️'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.classList.remove('translate-y-5', 'opacity-0');
  }, 10);

  // Animate out and remove
  setTimeout(() => {
    toast.classList.add('translate-y-5', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Cart Drawer Visibility
function toggleCart(open) {
  if (open) {
    cartOverlay.classList.remove('hidden');
    cartDrawer.classList.remove('translate-x-full');
  } else {
    cartOverlay.classList.add('hidden');
    cartDrawer.classList.add('translate-x-full');
  }
}

cartToggleBtn.addEventListener('click', () => toggleCart(true));
cartCloseBtn.addEventListener('click', () => toggleCart(false));
cartOverlay.addEventListener('click', () => toggleCart(false));

// Tracking Modal Visibility
if (trackModalBtn) trackModalBtn.addEventListener('click', () => trackModal.classList.remove('hidden'));
if (trackCloseBtn) trackCloseBtn.addEventListener('click', () => trackModal.classList.add('hidden'));

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
  renderFlavors();
}

// Render Flavors with Bottle Pictures
function renderFlavors() {
  const grid = document.getElementById('flavor-grid') || document.getElementById('flavors-grid');
  const status = document.getElementById('status-indicator');
  if (!grid) return;

  const filtered = activeCategory === 'All' 
    ? menuFlavors 
    : menuFlavors.filter(f => f.category && f.category.toUpperCase() === activeCategory);

  if (status) status.textContent = `${filtered.length} flavors shown`;

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="text-zinc-400 col-span-full py-8 text-center">No flavors found in this category.</p>`;
    return;
  }

  grid.innerHTML = filtered.map(f => {
    const isAvailable = f.is_available !== false; // defaults to true

    return `
      <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden ${!isAvailable ? 'opacity-60' : ''}">
        ${!isAvailable ? '<span class="absolute top-3 right-3 bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">Out of Stock</span>' : ''}
        
        <img src="${f.image_url || 'images/' + f.name.toLowerCase().replace(/\\s+/g, '-') + '.jpg'}" alt="${f.name}" class="w-full h-36 object-contain mb-3 rounded-xl">
        
        <div class="space-y-1 mb-4">
          <h3 class="font-bold text-white text-sm">${f.name}</h3>
          <p class="text-emerald-400 font-extrabold text-sm">₹${f.price}</p>
        </div>

        <button 
          onclick="${isAvailable ? `addToCart(${f.id})` : ''}" 
          ${!isAvailable ? 'disabled' : ''}
          class="w-full py-2 rounded-xl text-xs font-bold transition ${
            isAvailable 
              ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 cursor-pointer' 
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
          }">
          ${isAvailable ? 'Add to Cart' : 'Sold Out'}
        </button>
      </div>
    `;
  }).join('');
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

  cartCountBadge.textContent = totalCount;
  cartDrawerCount.textContent = `${totalCount} item${totalCount === 1 ? '' : 's'}`;
  
  cartSubtotal.textContent = `₹${subtotal}`;
  cartTaxes.textContent = `₹${taxes}`;
  cartTotal.textContent = `₹${grandTotal}`;

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
    renderFlavors();
  } catch (err) {
    console.error('Database connection error:', err);
    status.textContent = 'Connection Error';
  }
}

fetchFlavors();
