// Supabase Configuration
const SUPABASE_URL = 'https://ukkhhhmjblzyuazumqpt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_u0xqV1xW9zPwzWtqGn86_Q_TA0_FNrn';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fetch & Render Orders
async function fetchOrders() {
  const tbody = document.getElementById('orders-table-body');
  const countBadge = document.getElementById('order-count');

  try {
    const { data: orders, error } = await supabaseClient
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    countBadge.textContent = `${orders.length} Total Orders`;

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-zinc-500">No orders placed yet. Place a test order from the shop!</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(order => {
      const date = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const itemsList = Array.isArray(order.items) 
        ? order.items.map(i => `${i.quantity}x ${i.name}`).join('<br/>') 
        : 'No items detailed';

      const statusColors = {
        'Pending': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        'Out for Delivery': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'Delivered': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      };

      return `
        <tr class="hover:bg-zinc-800/30 transition">
          <td class="p-4 font-mono text-xs">
            <span class="font-bold text-white">#${order.id}</span>
            <div class="text-zinc-500">${date}</div>
          </td>
          <td class="p-4">
            <div class="font-bold text-white">${order.customer_name}</div>
            <div class="text-xs text-emerald-400 font-mono">${order.phone}</div>
            <div class="text-xs text-zinc-400 max-w-xs truncate">${order.address}</div>
          </td>
          <td class="p-4 text-xs font-mono text-zinc-300 leading-relaxed">${itemsList}</td>
          <td class="p-4 font-black text-emerald-400">₹${order.total_amount}</td>
          <td class="p-4">
            <select onchange="updateOrderStatus(${order.id}, this.value)" class="bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-semibold px-2 py-1 focus:outline-none ${statusColors[order.status] || ''}">
              <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Out for Delivery" ${order.status === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
              <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
            </select>
          </td>
          <td class="p-4 text-right">
            <button onclick="deleteOrder(${order.id})" class="text-xs text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 px-2.5 py-1 rounded-lg transition">
              Delete
            </button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Error fetching orders:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-400">Failed to load orders: ${err.message}</td></tr>`;
  }
}

// Update Order Status
async function updateOrderStatus(orderId, newStatus) {
  try {
    const { error } = await supabaseClient
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) throw error;
    fetchOrders();
  } catch (err) {
    alert(`Failed to update status: ${err.message}`);
  }
}

// Delete Order
async function deleteOrder(orderId) {
  if (!confirm(`Are you sure you want to delete order #${orderId}?`)) return;

  try {
    const { error } = await supabaseClient
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) throw error;
    fetchOrders();
  } catch (err) {
    alert(`Failed to delete order: ${err.message}`);
  }
}

// Initial Fetch
fetchOrders();
