const SUPABASE_URL = 'https://ukkhhhmjblzyuazumqpt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_u0xqV1xW9zPwzWtqGn86_Q_TA0_FNrn';
const supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allOrdersCache = [];

async function fetchAdminOrders() {
  const statusEl = document.getElementById('admin-status');
  if (statusEl) statusEl.textContent = 'Fetching latest data...';

  try {
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allOrdersCache = orders || [];

    if (statusEl) statusEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;

    // Update Stats
    const totalOrders = allOrdersCache.length;
    const pendingOrders = allOrdersCache.filter(o => o.status !== 'Delivered').length;
    const totalRev = allOrdersCache.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const statTotal = document.getElementById('stat-total');
    const statPending = document.getElementById('stat-pending');
    const statRevenue = document.getElementById('stat-revenue');

    if (statTotal) statTotal.textContent = totalOrders;
    if (statPending) statPending.textContent = pendingOrders;
    if (statRevenue) statRevenue.textContent = `₹${totalRev}`;

    // Update Analytics Widget
    const today = new Date().toDateString();
    const todayOrders = allOrdersCache.filter(o => new Date(o.created_at).toDateString() === today);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const statTotalOrders = document.getElementById('stat-total-orders');
    const statTotalRevenue = document.getElementById('stat-total-revenue');
    const statTopFlavor = document.getElementById('stat-top-flavor');

    if (statTotalOrders) statTotalOrders.textContent = todayOrders.length;
    if (statTotalRevenue) statTotalRevenue.textContent = `₹${todayRevenue}`;

    // Calculate top selling flavor from items arrays
    if (statTopFlavor) {
      const flavorCount = {};
      allOrdersCache.forEach(o => {
        if (Array.isArray(o.items)) {
          o.items.forEach(item => {
            flavorCount[item.name] = (flavorCount[item.name] || 0) + (item.quantity || 1);
          });
        }
      });
      const topFlavor = Object.entries(flavorCount).sort((a, b) => b[1] - a[1])[0];
      statTopFlavor.textContent = topFlavor ? `${topFlavor[0]} 🍾` : '—';
    }

    filterAdminOrders();

  } catch (err) {
    console.error('Error fetching admin orders:', err);
    if (statusEl) statusEl.textContent = 'Error loading orders.';
  }
}

function filterAdminOrders() {
  const query = (document.getElementById('admin-search-input')?.value || '').toLowerCase();
  const selectedStatus = document.getElementById('admin-status-filter')?.value || 'ALL';

  const filtered = allOrdersCache.filter(o => {
    const matchesQuery = 
      (o.customer_name || '').toLowerCase().includes(query) ||
      (o.phone || '').includes(query) ||
      (o.utr_number || '').toLowerCase().includes(query) ||
      (o.id || '').toString().includes(query);

    const matchesStatus = selectedStatus === 'ALL' || o.status === selectedStatus;

    return matchesQuery && matchesStatus;
  });

  renderOrdersTable(filtered);
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-zinc-500">No matching orders found.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    const itemList = Array.isArray(o.items)
      ? o.items.map(i => `${i.name} x${i.quantity}`).join(', ')
      : 'N/A';

    const isDelivered = o.status === 'Delivered';

    return `
      <tr class="hover:bg-zinc-800/30 transition">
        <td class="px-4 py-3 font-mono text-xs text-emerald-400 font-bold">#${o.id}</td>
        <td class="px-4 py-3 font-semibold text-white">${o.customer_name || 'N/A'}<br><span class="text-[10px] text-zinc-500">${o.address || ''}</span></td>
        <td class="px-4 py-3 text-xs text-zinc-300 font-mono">${o.phone || 'N/A'}</td>
        <td class="px-4 py-3 text-xs text-emerald-400 font-mono font-bold">
          ${o.utr_number || 'N/A'}
        </td>
        <td class="px-4 py-3 text-xs text-zinc-400 max-w-xs truncate">${itemList}</td>
        <td class="px-4 py-3 font-bold text-white">₹${o.total_amount}</td>
        <td class="px-4 py-3">
          <span class="text-[10px] font-bold px-2 py-1 rounded border ${
            isDelivered
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }">
            ${o.status || 'Preparing'}
          </span>
        </td>
        <td class="px-4 py-3 text-right">
          <button onclick="updateOrderStatus(${o.id}, '${isDelivered ? 'Preparing' : 'Delivered'}')" class="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold px-2.5 py-1 rounded border border-zinc-700 transition">
            Mark ${isDelivered ? 'Pending' : 'Delivered'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) throw error;
    fetchAdminOrders();
  } catch (err) {
    alert(`Could not update order status: ${err.message}`);
  }
}

// Initial Fetch
fetchAdminOrders();
fetchAdminFlavors();

// Auto-refresh every 15 seconds
setInterval(fetchAdminOrders, 15000);

// Fetch & Render Flavor Stock Status
async function fetchAdminFlavors() {
  const container = document.getElementById('admin-flavors-grid');
  if (!container) return;

  try {
    const { data: flavors, error } = await supabaseAdmin
      .from('flavors')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    container.innerHTML = flavors.map(f => `
      <div class="bg-zinc-950 border border-zinc-800 p-3 rounded-lg flex items-center justify-between">
        <div>
          <p class="font-bold text-white text-xs">${f.name}</p>
          <p class="text-[10px] text-zinc-500">₹${f.price}</p>
        </div>
        <button 
          onclick="toggleFlavorStock(${f.id}, ${!f.is_available})" 
          class="text-[10px] font-bold px-2 py-1 rounded border transition ${
            f.is_available 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
          }">
          ${f.is_available ? 'In Stock' : 'Out of Stock'}
        </button>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error fetching flavors:', err);
  }
}

// Toggle Flavor Stock Status
async function toggleFlavorStock(flavorId, newStatus) {
  try {
    const { error } = await supabaseAdmin
      .from('flavors')
      .update({ is_available: newStatus })
      .eq('id', flavorId);

    if (error) throw error;
    fetchAdminFlavors();
  } catch (err) {
    alert(`Failed to update stock: ${err.message}`);
  }
}

// Admin Store Toggle Handler
const storeToggle = document.getElementById('store-online-toggle');
const storeLabel = document.getElementById('store-status-label');

// Sync store state to Supabase from Admin
storeToggle?.addEventListener('change', async (e) => {
  const isOnline = e.target.checked;
  localStorage.setItem('store_online', isOnline);

  if (storeLabel) {
    storeLabel.textContent = isOnline ? 'Store Online' : 'Store Offline';
    storeLabel.className = isOnline ? 'font-semibold text-emerald-400' : 'font-semibold text-rose-400';
  }

  // Update Supabase
  const { error } = await supabaseAdmin
    .from('store_settings')
    .update({ is_online: isOnline, updated_at: new Date() })
    .eq('id', 1);

  if (error) console.error('Failed to update store status in Supabase:', error);
});

// Initialize toggle state from localStorage
if (storeToggle && localStorage.getItem('store_online') === 'false') {
  storeToggle.checked = false;
  storeToggle.dispatchEvent(new Event('change'));
}
