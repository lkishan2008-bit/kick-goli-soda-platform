const SUPABASE_URL = 'https://ukkhhhmjblzyuazumqpt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_u0xqV1xW9zPwzWtqGn86_Q_TA0_FNrn';
const supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fetchAdminOrders() {
  const statusEl = document.getElementById('admin-status');
  const tbody = document.getElementById('orders-tbody');
  if (statusEl) statusEl.textContent = 'Fetching latest data...';

  try {
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (statusEl) statusEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    
    // Update Stats
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status !== 'Delivered').length;
    const totalRev = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const statTotal = document.getElementById('stat-total');
    const statPending = document.getElementById('stat-pending');
    const statRevenue = document.getElementById('stat-revenue');

    if (statTotal) statTotal.textContent = totalOrders;
    if (statPending) statPending.textContent = pendingOrders;
    if (statRevenue) statRevenue.textContent = `₹${totalRev}`;

    if (!tbody) return;

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-zinc-500">No orders received yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(o => {
      const itemList = Array.isArray(o.items)
        ? o.items.map(i => `${i.name} x${i.quantity}`).join(', ')
        : 'N/A';

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
              o.status === 'Delivered' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }">
              ${o.status || 'Preparing'}
            </span>
          </td>
          <td class="px-4 py-3 text-right">
            <button onclick="updateOrderStatus(${o.id}, '${o.status === 'Delivered' ? 'Preparing' : 'Delivered'}')" class="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold px-2.5 py-1 rounded border border-zinc-700 transition">
              Mark ${o.status === 'Delivered' ? 'Pending' : 'Delivered'}
            </button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Error fetching admin orders:', err);
    if (statusEl) statusEl.textContent = 'Error loading orders.';
  }
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

// Auto-refresh every 15 seconds
setInterval(fetchAdminOrders, 15000);


