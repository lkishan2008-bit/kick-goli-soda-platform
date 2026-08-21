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

// Modal Visibility
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

function renderFlavors() {
  const grid = document.getElementById('flavor-grid');
  const status = document.getElementById('status-indicator');

  const filtered = activeCategory === 'All' 
    ? menuFlavors 
    : menuFlavors.filter(f => f.category.toUpperCase() === activeCategory);

  status.textContent = `${filtered.length} items shown`;

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="text-zinc-400 col-span-full py-8 text-center">No flavors found in this category.</p>`;
    return;
  }

  grid.innerHTML = filtered.map(item => `
    <div class="bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 transition duration-300 rounded-xl p-6 flex flex-col justify-between">
      <div>
        <div class="flex justify-between items-start mb-2">
          <span class="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">${item.category}</span>
          ${item.badge ? `<span class="text-xs font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">${item.badge}</span>` : ''}
        </div>
        <h3 class="text-xl font-bold mb-1">${item.name}</h3>
        <p class="text-zinc-400 text-sm mb-4">${item.description || ''}</p>
      </div>
      <div class="flex justify-between items-center pt-4 border-t border-zinc-800/60">
        <span class="text-2xl font-black text-white">₹${item.price}</span>
        <button onclick="addToCart(${item.id})" class="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-4 py-2 rounded-lg text-sm transition flex items-center gap-1">
          + Add to Order
        </button>
      </div>
    </div>
  `).join('');
}

// Cart State Operations
function addToCart(flavorId) {
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

// Order Submission
orderForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  submitOrderBtn.disabled = true;
  submitOrderBtn.textContent = 'Submitting Order...';
  checkoutError.classList.add('hidden');

  const name = document.getElementById('cust-name').value;
  const phone = document.getElementById('cust-phone').value;
  const address = document.getElementById('cust-address').value;

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const grandTotal = subtotal + (subtotal > 0 ? Math.round(subtotal * 0.05) : 0);

  try {
    const { data, error } = await supabaseClient
      .from('orders')
      .insert([{
        customer_name: name,
        phone: phone,
        address: address,
        items: cart,
        total_amount: grandTotal
      }]);

    if (error) throw error;

    cart = [];
    updateCartUI();
    checkoutModal.classList.add('hidden');
    orderForm.reset();
    alert('🎉 Order placed successfully! We are preparing your fizz.');

  } catch (err) {
    console.error('Order submission error:', err);
    checkoutError.textContent = `Order Error: ${err.message || 'Could not insert into orders table.'}`;
    checkoutError.classList.remove('hidden');
  } finally {
    submitOrderBtn.disabled = false;
    submitOrderBtn.textContent = 'Confirm Order';
  }
});

// Database Initialization
async function fetchFlavors() {
  const status = document.getElementById('status-indicator');

  try {
    const { data, error } = await supabaseClient
      .from('flavors')
      .select('*');

    if (error) throw error;

    menuFlavors = data || [];
    renderFlavors();

  } catch (err) {
    console.error('Database connection error:', err);
    status.textContent = 'Connection Error';
    document.getElementById('flavor-grid').innerHTML = `
      <div class="col-span-full bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
        <p class="text-red-400 font-semibold mb-2">Failed to load flavors from database.</p>
        <p class="text-xs text-zinc-400 font-mono">${err.message || 'Check console for details.'}</p>
      </div>
    `;
  }
}

fetchFlavors();
