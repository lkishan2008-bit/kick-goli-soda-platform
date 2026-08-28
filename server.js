require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Enable CORS for Vercel and AWS deployments
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ukkhhhmjblzyuazumqpt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_u0xqV1xW9zPwzWtqGn86_Q_TA0_FNrn';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running!' });
});

// Create Order API Endpoint
app.post('/api/orders', async (req, res) => {
  const { user_email, flavor, quantity, total_price } = req.body;
  
  if (!flavor || !quantity || !total_price) {
    return res.status(400).json({ error: 'Missing required order fields (flavor, quantity, total_price)' });
  }

  const { data, error } = await supabase
    .from('orders')
    .insert([{ user_email: user_email || null, flavor, quantity, total_price }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Order placed successfully!', order: data });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
