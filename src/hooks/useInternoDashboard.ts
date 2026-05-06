import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PROJECTS_BY_CITY } from '../types';

export interface DashboardFilters {
  period: string;
  project: string;
  broker: string;
  startDate?: string;
  endDate?: string;
  competence?: string;
  city?: string;
}

export function useInternoDashboard(filters: DashboardFilters) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);
  const [funnelData, setFunnelData] = useState<{ name: string; value: number }[]>([]);
  const [stackedStatusData, setStackedStatusData] = useState<any[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [brokerTimeData, setBrokerTimeData] = useState<{ name: string; time: number }[]>([]);
  const [brokerActionsData, setBrokerActionsData] = useState<{ name: string; actions: number }[]>([]);
  const [originData, setOriginData] = useState<{ name: string; value: number }[]>([]);
  const [cancelReasons, setCancelReasons] = useState<{ reason: string; count: number }[]>([]);
  const [brokerLeads, setBrokerLeads] = useState<{ name: string; value: number }[]>([]);
  const [lineData, setLineData] = useState<any[]>([]);
  const [lineChartKeys, setLineChartKeys] = useState<string[]>([]);
  
  const [totalLeads, setTotalLeads] = useState(0);
  const [hottestStatusData, setHottestStatusData] = useState({ visita: 0, agendamento: 0, proposta: 0, venda: 0 });

  useEffect(() => {
    async function fetchData() {
      if (!supabase) {
        setError('Supabase client not initialized');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Determine Date Range
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();

        if (filters.period === 'Todo o período') {
          startDate = new Date(2025, 11, 1); // December 1, 2025
        } else if (filters.period === 'Últimos 30 dias') {
          startDate.setDate(now.getDate() - 30);
        } else if (filters.period === 'Este mês' || filters.period === 'Mês Atual') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (filters.period === 'Mês passado' || filters.period === 'Mês Passado') {
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (filters.period === 'Personalizado' && filters.startDate && filters.endDate) {
          startDate = new Date(`${filters.startDate}T00:00:00`);
          endDate = new Date(`${filters.endDate}T23:59:59.999`);
        } else {
          // Default fallback
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const formatYYYYMMDDEnd = (date: Date) => {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}T23:59:59.999Z`;
        };
        const formatYYYYMMDDStart = (date: Date) => {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}T00:00:00.000Z`;
        };

        const startDateStr = formatYYYYMMDDStart(startDate);
        const endDateStr = formatYYYYMMDDEnd(endDate);

        const applyProjectFilter = (query: any) => {
          if (filters.project !== 'Todos') {
            return (query as any).ilike('empreendimento', `%${filters.project}%`);
          } else if (filters.city && filters.city !== 'ALL') {
            const cityProjects = PROJECTS_BY_CITY[filters.city as keyof typeof PROJECTS_BY_CITY];
            if (cityProjects && cityProjects.length > 0) {
              return query.in('empreendimento', cityProjects);
            }
          }
          return query;
        };

        // 1. Fetch current leads status (for the first chart and total leads)
        // Adjust column names based on your actual 'leads' table schema
        let leadsData: any[] | null = [];
        
        if (filters.competence && filters.competence !== 'Atual') {
          let snapshotQuery = supabase
            .from('view_lead_snapshot_mensal')
            .select('status_final_mes, id_cv, lead_data_cad, origem, corretor, empreendimento')
            .gte('lead_data_cad', startDateStr)
            .lte('lead_data_cad', endDateStr);
            
          snapshotQuery = (snapshotQuery as any).like('competencia_data', `${filters.competence.substring(0, 7)}%`);

          snapshotQuery = applyProjectFilter(snapshotQuery);
          if (filters.broker !== 'Todos') {
            snapshotQuery = (snapshotQuery as any).ilike('corretor', `%${filters.broker}%`);
          }

          const { data, error } = await snapshotQuery;
          if (error) throw error;
          
          // Map snapshot data to match leadsData structure for processing
          leadsData = data?.map(item => ({
            status_atual: item.status_final_mes,
            id: item.id_cv,
            lead_data_cad: item.lead_data_cad,
            origem: item.origem,
            motivo_cancelamento: null, // Not available in snapshot view
            corretor: item.corretor,
            empreendimento: item.empreendimento
          })) || [];
        } else {
          let leadsQuery = supabase
            .from('leads')
            .select('status_atual, id_cv, data_criacao_cv, origem, motivo_cancelamento, corretor, empreendimento')
            .gte('data_criacao_cv', startDateStr)
            .lte('data_criacao_cv', endDateStr);

          leadsQuery = applyProjectFilter(leadsQuery);
          if (filters.broker !== 'Todos') {
            leadsQuery = (leadsQuery as any).ilike('corretor', `%${filters.broker}%`);
          }

          const { data, error } = await leadsQuery;
          if (error) throw error;
          
          leadsData = data?.map(item => ({
            status_atual: item.status_atual,
            id: item.id_cv,
            lead_data_cad: item.data_criacao_cv,
            origem: item.origem,
            motivo_cancelamento: item.motivo_cancelamento,
            corretor: item.corretor,
            empreendimento: item.empreendimento
          })) || [];
        }

        if (leadsData) {
          setTotalLeads(leadsData.length);
          
          const statusCounts: Record<string, number> = {};
          const originCounts: Record<string, number> = {};
          const cancelCounts: Record<string, number> = {};
          const brokerCounts: Record<string, number> = {};
          const lineDataMap: Record<string, any> = {};

          leadsData.forEach(lead => {
            // Status
            const status = lead.status_atual || 'Sem Status';
            statusCounts[status] = (statusCounts[status] || 0) + 1;

            // Origem Tratada
            let origin = lead.origem || 'Desconhecida';
            const originLower = origin.toLowerCase();
            if (originLower.includes('facebook') || originLower.includes('fb') || originLower.includes('instagram') || originLower.includes('ig') || originLower.includes('meta')) {
              origin = 'Facebook';
            } else if (originLower.includes('google') || originLower.includes('adwords')) {
              origin = 'Google';
            } else if (originLower.includes('site') || originLower.includes('organico') || originLower.includes('orgânico') || originLower.includes('seo')) {
              origin = 'Site';
            } else {
              origin = 'Outros';
            }
            originCounts[origin] = (originCounts[origin] || 0) + 1;

            // Motivo Cancelamento
            if (lead.motivo_cancelamento && lead.motivo_cancelamento.trim() !== '') {
              const motivo = lead.motivo_cancelamento.trim();
              cancelCounts[motivo] = (cancelCounts[motivo] || 0) + 1;
            }

            // Corretor
            const corretor = lead.corretor || 'Sem Corretor';
            brokerCounts[corretor] = (brokerCounts[corretor] || 0) + 1;

            // Evolução (Line Chart)
            if (lead.lead_data_cad) {
              // Create date object handling timezone issues by appending time if it's just a date string
              const dateObj = new Date(lead.lead_data_cad.includes('T') ? lead.lead_data_cad : `${lead.lead_data_cad}T12:00:00Z`);
              const sortKey = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
              const displayDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
              const emp = lead.empreendimento || 'Outros';
              
              if (!lineDataMap[sortKey]) {
                lineDataMap[sortKey] = { date: displayDate, sortKey };
              }
              lineDataMap[sortKey][emp] = (lineDataMap[sortKey][emp] || 0) + 1;
            }
          });

          setStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
          setOriginData(Object.entries(originCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
          setCancelReasons(Object.entries(cancelCounts).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count));
          setBrokerLeads(Object.entries(brokerCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
          
          // Sort line data by date
          const sortedLineData = Object.values(lineDataMap).sort((a, b) => {
            return a.sortKey.localeCompare(b.sortKey);
          });
          setLineData(sortedLineData);

          // Extract unique empreendimentos for line chart keys, sorted by total volume
          const empTotals: Record<string, number> = {};
          leadsData.forEach(lead => {
            if (lead.lead_data_cad) {
              const emp = lead.empreendimento || 'Outros';
              empTotals[emp] = (empTotals[emp] || 0) + 1;
            }
          });
          const sortedEmpKeys = Object.entries(empTotals)
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0]);
          setLineChartKeys(sortedEmpKeys);

          // --- Funnel & Hottest Status (One Query) ---
          let funnelQuery = supabase
            .from('view_funil_maximo_com_total')
            .select('etapa_visual, lead_id')
            .gte('safra_data', startDateStr)
            .lte('safra_data', endDateStr);

          funnelQuery = applyProjectFilter(funnelQuery);
          if (filters.broker !== 'Todos') {
            funnelQuery = (funnelQuery as any).ilike('corretor', `%${filters.broker}%`);
          }
          
          const funnelPromise = funnelQuery;

          // --- Snapshots in Parallel Chunks ---
          const leadIds = leadsData.map(l => l.id);
          const chunkSize = 1000;
          const snapshotPromises = [];

          for (let i = 0; i < leadIds.length; i += chunkSize) {
            snapshotPromises.push(
              supabase
                .from('view_lead_snapshot_mensal')
                .select('status_final_mes, competencia_data, lead_id')
                .in('lead_id', leadIds.slice(i, i + chunkSize))
            );
          }

          // Await everything in parallel
          const [funnelRes, ...snapshotRes] = await Promise.all([funnelPromise, ...snapshotPromises]);
          
          // Process Funnel & Hottest Status
          const funnelCounts: Record<string, Set<string>> = {};
          const leadHottestStatus = new Map<string, number>();

          if (!funnelRes.error && funnelRes.data) {
            funnelRes.data.forEach(row => {
              const etapa = row.etapa_visual;
              const leadId = row.lead_id;
              if (etapa && leadId) {
                if (!funnelCounts[etapa]) {
                  funnelCounts[etapa] = new Set();
                }
                funnelCounts[etapa].add(leadId);

                const fase = etapa.toLowerCase();
                let score = 0;
                if (fase.includes('venda')) score = 4;
                else if (fase.includes('proposta') || fase.includes('negocia')) score = 3;
                else if (fase.includes('visita')) score = 2;
                else if (fase.includes('agendamento') || fase.includes('agendado')) score = 1;
                
                const currentScore = leadHottestStatus.get(leadId) || 0;
                if (score > currentScore) {
                  leadHottestStatus.set(leadId, score);
                }
              }
            });
          } else if (funnelRes.error) {
             console.error("Funnel error:", funnelRes.error);
          }

          const sortedFunnelData = Object.entries(funnelCounts)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([name, dataSet]) => ({ name, value: dataSet.size }));
            
          setFunnelData(sortedFunnelData);
          
          const totalStage = sortedFunnelData.find(item => item.name.includes('Total de Leads'));
          if (totalStage) {
            setTotalLeads(totalStage.value);
          }

          let rCount = 0; // Vendas
          let pCount = 0; // Propostas
          let vCount = 0; // Visitas
          let aCount = 0; // Agendamento
          leadHottestStatus.forEach(score => {
            if (score >= 4) rCount++;
            if (score >= 3) pCount++;
            if (score >= 2) vCount++;
            if (score >= 1) aCount++;
          });
          setHottestStatusData({ visita: vCount, agendamento: aCount, proposta: pCount, venda: rCount });

          // Process Snapshots
          const snapshotDataAll = snapshotRes.flatMap(res => res.data || []);
          const stackedDataMap = new Map<string, Map<string, Set<string>>>();
          const monthsSet = new Set<string>();
          const monthRawMap = new Map<string, string>();

          snapshotDataAll.forEach(row => {
            const status = row.status_final_mes || 'Sem Status';
            if (status.toLowerCase().includes('ação') || status.toLowerCase().includes('acao')) return; // exclude ação de marketing/etc.
            const compData = row.competencia_data;
            if (!compData) return;
            
            // Handle YYYY-MM or YYYY-MM-DD
            const dateStr = compData.length === 7 ? `${compData}-01T12:00:00Z` : `${compData}T12:00:00Z`;
            const dateObj = new Date(dateStr);
            const monthStr = dateObj.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
            
            monthsSet.add(monthStr);
            monthRawMap.set(monthStr, compData);
            
            if (!stackedDataMap.has(status)) {
              stackedDataMap.set(status, new Map());
            }
            const statusMonths = stackedDataMap.get(status)!;
            if (!statusMonths.has(monthStr)) {
              statusMonths.set(monthStr, new Set());
            }
            if (row.lead_id) {
              statusMonths.get(monthStr)!.add(row.lead_id);
            }
          });

          // Sort months chronologically (Ascending)
          const sortedMonths = Array.from(monthsSet).sort((a, b) => {
            const rawA = monthRawMap.get(a) || '';
            const rawB = monthRawMap.get(b) || '';
            return rawA.localeCompare(rawB);
          });

          setAvailableMonths(sortedMonths);
          
          const finalStackedData = Array.from(stackedDataMap.entries()).map(([status, monthsMap]) => {
            const obj: any = { status };
            let total = 0;
            sortedMonths.forEach(month => {
              const count = monthsMap.get(month)?.size || 0;
              obj[month] = count;
              total += count;
            });
            obj.total = total;
            return obj;
          }).sort((a, b) => b.total - a.total); // Sort by total descending

          setStackedStatusData(finalStackedData);
        }

        // 3. Fetch Broker Time (TMA)
        let tmaQuery = supabase
          .from('view_tma_fila_atendimento')
          .select('*');
          
        tmaQuery = applyProjectFilter(tmaQuery);
        if (filters.broker !== 'Todos') {
          tmaQuery = (tmaQuery as any).ilike('corretor', `%${filters.broker}%`);
        }

        const { data: tmaData, error: tmaError } = await tmaQuery;

        if (!tmaError && tmaData) {
          // Assuming columns like 'corretor' and 'tma_horas'
          if (tmaData.length > 0 && 'corretor' in tmaData[0]) {
            const formattedTma = tmaData.map((item: any) => ({
              name: item.corretor || 'Desconhecido',
              time: Number(item.tma_horas || item.tempo_medio || 0)
            })).sort((a, b) => b.time - a.time);
            setBrokerTimeData(formattedTma);
          }
        } else if (tmaError) {
          console.error('Error fetching TMA data:', tmaError);
        }

        // 4. Fetch Broker Actions (Esforço)
        let actionsQuery = supabase
          .from('view_esforco_corretor')
          .select('*');
          
        actionsQuery = applyProjectFilter(actionsQuery);
        if (filters.broker !== 'Todos') {
          actionsQuery = (actionsQuery as any).ilike('corretor', `%${filters.broker}%`);
        }

        const { data: actionsData, error: actionsError } = await actionsQuery;

        if (!actionsError && actionsData) {
          // Assuming columns like 'corretor' and 'total_acoes'
          if (actionsData.length > 0 && 'corretor' in actionsData[0]) {
            const formattedActions = actionsData.map((item: any) => ({
              name: item.corretor || 'Desconhecido',
              actions: Number(item.total_acoes || item.acoes || 0)
            })).sort((a, b) => b.actions - a.actions);
            setBrokerActionsData(formattedActions);
          }
        } else if (actionsError) {
          console.error('Error fetching Actions data:', actionsError);
        }

      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message || 'Erro ao carregar dados do dashboard');
        
        // Detailed error logging
        if (err.details) console.error('Error details:', err.details);
        if (err.hint) console.error('Error hint:', err.hint);
        if (err.code) console.error('Error code:', err.code);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [filters]); // Re-fetch when filters change

  return {
    loading,
    error,
    statusData,
    funnelData,
    stackedStatusData,
    availableMonths,
    brokerTimeData,
    brokerActionsData,
    originData,
    cancelReasons,
    brokerLeads,
    lineData,
    lineChartKeys,
    totalLeads,
    hottestStatusData
  };
}
