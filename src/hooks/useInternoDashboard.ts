import { useState, useEffect, useMemo } from 'react';
import localforage from 'localforage';
import { supabase } from '../lib/supabase';
import { PROJECTS_BY_CITY } from '../types';

export interface DashboardFilters {
  period: string;
  project: string;
  broker: string;
  origin?: string;
  startDate?: string;
  endDate?: string;
  competence?: string;
  city?: string;
  interactiveFilters?: {
    origin?: string;
    cancelReason?: string;
    month?: string;
    status?: string;
  };
}

export function useInternoDashboard(filters: DashboardFilters) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rawData, setRawData] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      if (!supabase) {
        setError('Supabase client not initialized');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const cacheKey = `dashboardCache_${JSON.stringify({
        period: filters.period,
        project: filters.project,
        broker: filters.broker,
        competence: filters.competence,
        startDate: filters.startDate,
        endDate: filters.endDate,
        city: filters.city
      })}`;

      try {
        const cachedRawData = await localforage.getItem(cacheKey);
        if (cachedRawData) {
          setRawData(cachedRawData);
          setLoading(false); // Update UI immediately from cache
        }
      } catch (e) {
        console.error('Cache read error', e);
      }

      try {
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();

        if (filters.period === 'Todo o período') {
          startDate = new Date(2023, 0, 1);
        } else if (filters.period === 'Últimos 30 dias') {
          startDate.setDate(now.getDate() - 30);
        } else if (filters.period === 'Este mês' || filters.period === 'Mês Atual') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (filters.period === 'Mês passado' || filters.period === 'Mês Passado') {
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (filters.period === 'Personalizado' && filters.startDate && filters.endDate) {
          startDate = new Date(filters.startDate + 'T00:00:00');
          endDate = new Date(filters.endDate + 'T23:59:59.999');
        } else {
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
          
          leadsData = data?.map((item: any) => ({
            status_atual: item.status_final_mes,
            id: item.id_cv,
            lead_data_cad: item.lead_data_cad,
            origem: item.origem,
            motivo_cancelamento: null,
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
          
          leadsData = data?.map((item: any) => ({
            status_atual: item.status_atual,
            id: item.id_cv,
            lead_data_cad: item.data_criacao_cv,
            origem: item.origem,
            motivo_cancelamento: item.motivo_cancelamento,
            corretor: item.corretor,
            empreendimento: item.empreendimento
          })) || [];
        }

        let funnelRes = { data: [] as any[], error: null };
        let snapshotRes: any[] = [];

        if (leadsData && leadsData.length > 0) {
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

           const res = await Promise.all([funnelPromise, ...snapshotPromises]);
           funnelRes = res[0] as any;
           snapshotRes = res.slice(1);
        }

        let tmaQuery = supabase.from('view_tma_fila_atendimento').select('*');
        tmaQuery = applyProjectFilter(tmaQuery);
        if (filters.broker !== 'Todos') {
          tmaQuery = (tmaQuery as any).ilike('corretor', `%${filters.broker}%`);
        }
        const { data: tmaData, error: tmaError } = await tmaQuery;

        let actionsQuery = supabase.from('view_esforco_corretor').select('*');
        actionsQuery = applyProjectFilter(actionsQuery);
        if (filters.broker !== 'Todos') {
          actionsQuery = (actionsQuery as any).ilike('corretor', `%${filters.broker}%`);
        }
        const { data: actionsData, error: actionsError } = await actionsQuery;

        const newRawData = {
          leadsData: leadsData || [],
          funnelRes,
          snapshotRes,
          tmaData: (!tmaError && tmaData) ? tmaData : [],
          actionsData: (!actionsError && actionsData) ? actionsData : []
        };

        setRawData(newRawData);

        try {
          await localforage.setItem(cacheKey, newRawData);
        } catch (e) {
          console.error("Cache write error", e);
        }

      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message || 'Erro ao carregar dados do dashboard');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [filters.period, filters.project, filters.broker, filters.competence, filters.startDate, filters.endDate, filters.city]); // Omit interactive filters to prevent refetching

  const computed = useMemo(() => {
    if (!rawData) {
      return {
        statusData: [], funnelData: [], stackedStatusData: [], availableMonths: [],
        brokerTimeData: [], brokerActionsData: [], originData: [], cancelReasons: [],
        brokerLeads: [], lineData: [], lineChartKeys: [], totalLeads: 0,
        hottestStatusData: { visita: 0, agendamento: 0, proposta: 0, venda: 0 }
      };
    }
    
    let leadsData = rawData.leadsData as any[];
    
    // Treat origins beforehand so we can filter by the treated name!
    leadsData = leadsData.map(lead => {
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
        return { ...lead, origin_treated: origin, motivo_cancelamento_treated: lead.motivo_cancelamento ? lead.motivo_cancelamento.trim() : null };
    });

    const activeFilter = filters.interactiveFilters || {};
    
    if (activeFilter.origin) {
       leadsData = leadsData.filter(l => l.origin_treated === activeFilter.origin);
    }
    if (activeFilter.cancelReason) {
       leadsData = leadsData.filter(l => l.motivo_cancelamento_treated === activeFilter.cancelReason);
    }

    if (filters.origin && filters.origin !== 'Todas') {
       leadsData = leadsData.filter(l => l.origin_treated === filters.origin);
    }
    
    // Create an set of active lead IDs
    const activeLeadIds = new Set(leadsData.map(l => l.id));

    const statusCounts: Record<string, number> = {};
    const originCounts: Record<string, number> = {};
    const cancelCounts: Record<string, number> = {};
    const brokerCounts: Record<string, number> = {};
    const lineDataMap: Record<string, any> = {};

    leadsData.forEach(lead => {
      const status = lead.status_atual || 'Sem Status';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      originCounts[lead.origin_treated] = (originCounts[lead.origin_treated] || 0) + 1;

      if (lead.motivo_cancelamento_treated) {
        cancelCounts[lead.motivo_cancelamento_treated] = (cancelCounts[lead.motivo_cancelamento_treated] || 0) + 1;
      }

      const corretor = lead.corretor || 'Sem Corretor';
      brokerCounts[corretor] = (brokerCounts[corretor] || 0) + 1;

      if (lead.lead_data_cad) {
        const dateObj = new Date(lead.lead_data_cad.includes('T') ? lead.lead_data_cad : `${lead.lead_data_cad}T12:00:00Z`);
        const sortKey = dateObj.toISOString().split('T')[0];
        const displayDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const emp = lead.empreendimento || 'Outros';
        
        if (!lineDataMap[sortKey]) {
          lineDataMap[sortKey] = { date: displayDate, sortKey };
        }
        lineDataMap[sortKey][emp] = (lineDataMap[sortKey][emp] || 0) + 1;
      }
    });

    const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const originData = Object.entries(originCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const cancelReasons = Object.entries(cancelCounts).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
    const brokerLeads = Object.entries(brokerCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    
    const sortedLineData = Object.values(lineDataMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    
    const empTotals: Record<string, number> = {};
    leadsData.forEach(lead => {
      if (lead.lead_data_cad) {
        const emp = lead.empreendimento || 'Outros';
        empTotals[emp] = (empTotals[emp] || 0) + 1;
      }
    });
    const lineChartKeys = Object.entries(empTotals).sort((a, b) => b[1] - a[1]).map(e => e[0]);

    // Funnel Processing
    const funnelCounts: Record<string, Set<string>> = {};
    const leadHottestStatus = new Map<string, number>();

    if (!rawData.funnelRes.error && rawData.funnelRes.data) {
      rawData.funnelRes.data.forEach((row: any) => {
        const leadId = row.lead_id;
        if (!activeLeadIds.has(leadId)) return; // FILTER BY ACTIVE LEADS
        
        const etapa = row.etapa_visual;
        if (etapa && leadId) {
          if (!funnelCounts[etapa]) funnelCounts[etapa] = new Set();
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
    }

    const funnelData = Object.entries(funnelCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, dataSet]) => ({ name, value: dataSet.size }));
      
    const totalStage = funnelData.find((item: any) => item.name.includes('Total de Leads'));
    const totalLeads = totalStage ? totalStage.value : leadsData.length;

    let rCount = 0;
    let pCount = 0;
    let vCount = 0;
    let aCount = 0;
    leadHottestStatus.forEach(score => {
      if (score >= 4) rCount++;
      if (score >= 3) pCount++;
      if (score >= 2) vCount++;
      if (score >= 1) aCount++;
    });
    const hottestStatusData = { visita: vCount, agendamento: aCount, proposta: pCount, venda: rCount };

    // Snapshots Processing
    const snapshotDataAll = rawData.snapshotRes.flatMap((res: any) => res.data || []);
    const stackedDataMap = new Map<string, Map<string, Set<string>>>();
    const monthsSet = new Set<string>();
    const monthRawMap = new Map<string, string>();

    snapshotDataAll.forEach((row: any) => {
      if (!activeLeadIds.has(row.lead_id)) return; // FILTER BY ACTIVE LEADS

      const status = row.status_final_mes || 'Sem Status';
      if (status.toLowerCase().includes('ação') || status.toLowerCase().includes('acao')) return; // exclude
      
      if (activeFilter.status && status !== activeFilter.status) return; // INTERACTIVE STATUS FILTER

      const compData = row.competencia_data;
      if (!compData) return;
      
      const dateStr = compData.length === 7 ? `${compData}-01T12:00:00Z` : `${compData}T12:00:00Z`;
      const dateObj = new Date(dateStr);
      let monthStr = dateObj.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      if (monthStr === 'Data Inválida' || monthStr === 'Invalid Date' || isNaN(dateObj.getTime())) {
          monthStr = compData;
      }
      
      if (activeFilter.month && monthStr !== activeFilter.month) return; // INTERACTIVE MONTH FILTER

      monthsSet.add(monthStr);
      monthRawMap.set(monthStr, compData);
      
      if (!stackedDataMap.has(status)) stackedDataMap.set(status, new Map());
      const statusMonths = stackedDataMap.get(status)!;
      if (!statusMonths.has(monthStr)) statusMonths.set(monthStr, new Set());
      if (row.lead_id) statusMonths.get(monthStr)!.add(row.lead_id);
    });

    const availableMonths = Array.from(monthsSet).sort((a, b) => {
      const rawA = monthRawMap.get(a) || '';
      const rawB = monthRawMap.get(b) || '';
      return rawA.localeCompare(rawB);
    });
    
    const stackedStatusData = Array.from(stackedDataMap.entries()).map(([status, monthsMap]) => {
      const obj: any = { status };
      let total = 0;
      availableMonths.forEach(month => {
        const count = monthsMap.get(month)?.size || 0;
        obj[month] = count;
        total += count;
      });
      obj.total = total;
      return obj;
    }).filter((d: any) => d.total > 0).sort((a: any, b: any) => b.total - a.total);

    // Broker Processing
    let brokerTimeData = rawData.tmaData;
    let brokerActionsData = rawData.actionsData;

    if (brokerTimeData.length > 0 && 'corretor' in brokerTimeData[0]) {
       brokerTimeData = brokerTimeData.map((item: any) => ({
         name: item.corretor || 'Desconhecido',
         time: Number(item.tma_horas || item.tempo_medio || 0)
       })).sort((a:any, b:any) => b.time - a.time);
    }
    
    if (brokerActionsData.length > 0 && 'corretor' in brokerActionsData[0]) {
       brokerActionsData = brokerActionsData.map((item: any) => ({
         name: item.corretor || 'Desconhecido',
         actions: Number(item.total_acoes || item.acoes || 0)
       })).sort((a:any, b:any) => b.actions - a.actions);
    }

    return {
      statusData, funnelData, stackedStatusData, availableMonths,
      brokerTimeData, brokerActionsData, originData, cancelReasons,
      brokerLeads, lineData: sortedLineData, lineChartKeys, totalLeads,
      hottestStatusData
    };
  }, [rawData, filters.interactiveFilters]);

  return {
    loading,
    error,
    ...computed
  };
}
