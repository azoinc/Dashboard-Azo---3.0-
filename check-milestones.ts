import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  console.log('Fetching one row from lead_milestones table to see all columns...');
  const { data, error } = await supabase.from('lead_milestones').select('*').limit(1);
  
  if (error) {
    console.error('Error fetching data:', error);
  } else if (data && data.length > 0) {
    console.log('Available columns in lead_milestones table:');
    console.log(Object.keys(data[0]).join(', '));
  } else {
    console.log('Table is empty, but query succeeded.');
  }
}

checkColumns();
