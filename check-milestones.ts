import { supabase } from './src/lib/supabase';

async function check() {
  const { data, error } = await supabase.from('lead_milestones').select('*').limit(1);
  console.log("Milestones columns:", data ? Object.keys(data[0]) : error);
  const { data: d2, error: e2 } = await supabase.from('view_lead_snapshot_mensal').select('*').limit(1);
  console.log("Snapshot columns:", d2 ? Object.keys(d2[0]) : e2);
  const { data: d3, error: e3 } = await supabase.from('view_tma_fila_atendimento').select('*').limit(1);
  console.log("TMA columns:", d3 ? Object.keys(d3[0]) : e3);
  const { data: d4, error: e4 } = await supabase.from('view_corretor_interacoes').select('*').limit(1);
  console.log("Corretor interações columns:", d4 ? Object.keys(d4[0]) : e4);
}
check();
