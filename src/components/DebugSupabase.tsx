import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function DebugSupabase() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkTables() {
      try {
        const info: any = {};
        
        // Check view_funil_maximo_com_total
        const { data: funnelData, error: funnelError } = await supabase
          .from('view_funil_maximo_com_total')
          .select('*')
          .limit(1);
          
        info.view_funil_maximo_com_total = {
          error: funnelError,
          columns: funnelData && funnelData.length > 0 ? Object.keys(funnelData[0]) : 'No data or error'
        };

        // Check view_lead_snapshot_mensal
        const { data: snapshotData, error: snapshotError } = await supabase
          .from('view_lead_snapshot_mensal')
          .select('*')
          .limit(1);
          
        info.view_lead_snapshot_mensal = {
          error: snapshotError,
          columns: snapshotData && snapshotData.length > 0 ? Object.keys(snapshotData[0]) : 'No data or error'
        };

        // Check lead_milestones
        const { data: milestonesData, error: milestonesError } = await supabase
          .from('lead_milestones')
          .select('*')
          .limit(1);
          
        info.lead_milestones = {
          error: milestonesError,
          columns: milestonesData && milestonesData.length > 0 ? Object.keys(milestonesData[0]) : 'No data or error'
        };

        setDebugInfo(info);
      } catch (err) {
        setDebugInfo({ error: String(err) });
      } finally {
        setLoading(false);
      }
    }

    checkTables();
  }, []);

  if (loading) return <div className="p-4 bg-gray-100 text-sm">Carregando debug...</div>;

  return (
    <div className="p-4 bg-gray-100 text-xs overflow-auto max-h-96 mb-4 rounded border border-gray-300">
      <h3 className="font-bold mb-2">Debug Supabase Views/Tables</h3>
      <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
    </div>
  );
}
