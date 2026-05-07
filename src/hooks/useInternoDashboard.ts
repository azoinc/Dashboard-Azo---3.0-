import { useState, useEffect, useMemo } from 'react';
import localforage from 'localforage';
import { supabase } from '../lib/supabase';
import { PROJECTS_BY_CITY } from '../types';

// Initialize localforage explicitly
localforage.config({
  name: 'InternoDashboard',
  storeName: 'dashboard_cache', // Should be alphanumeric, with underscores.
  description: 'Cache for the internal dashboard data'
});

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
      // We do not clear rawData manually here because we want to see the cached data immediately if available,
      // but if the fetch fails, we should clear it.

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
        } else {
          setRawData(null); // Clear old data if no cache
        }
      } catch (e) {
        console.error('Cache read error', e);
        setRawData(null);
      }

      try {
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();

        if (filters.period === 'Todo o período') {
          startDate = new Date(2026, 0, 1);
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

        const globalMinDate = new Date(2026, 0, 1);
        if (startDate < globalMinDate) startDate = globalMinDate;

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
            .select('status_final_mes, lead_id, lead_data_cad, origem, corretor, empreendimento')
            .gte('lead_data_cad', startDateStr)
            .lte('lead_data_cad', endDateStr);
            
          snapshotQuery = (snapshotQuery as any).eq('competencia_data', filters.competence);
          snapshotQuery = applyProjectFilter(snapshotQuery);
          if (filters.broker !== 'Todos') {
            snapshotQuery = (snapshotQuery as any).ilike('corretor', `%${filters.broker}%`);
          }

          const { data, error } = await snapshotQuery;
          if (error) {
            console.error('Snapshot query error:', error);
            throw error;
          }
          
          leadsData = data?.map((item: any) => ({
            status_atual: item.status_final_mes,
            id: item.lead_id,
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
        let tmaData: any[] = [];
        let actionsData: any[] = [];

        if (leadsData && leadsData.length > 0) {
           const leadIds = leadsData.map(l => l.id);
           const chunkSize = 1000;
           const snapshotPromises = [];
           const funnelPromises = [];
           const tmaPromises = [];
           const actionsPromises = [];

           for (let i = 0; i < leadIds.length; i += chunkSize) {
             const chunk = leadIds.slice(i, i + chunkSize);
             
             snapshotPromises.push(
               supabase
                 .from('view_lead_snapshot_mensal')
                 .select('status_final_mes, competencia_data, lead_id')
                 .in('lead_id', chunk)
             );
             
             funnelPromises.push(
               supabase
                 .from('view_funil_maximo_com_total')
                 .select('etapa_visual, lead_id')
                 .in('lead_id', chunk)
             );
             
             tmaPromises.push(
               supabase
                 .from('view_tma_fila_atendimento')
                 .select('corretor, segundos_espera')
                 .in('lead_id', chunk)
             );
             
             actionsPromises.push(
               supabase
                 .from('view_esforco_corretor')
                 .select('corretor, lead_id')
                 .in('lead_id', chunk)
             );
           }

           const res = await Promise.all([...funnelPromises, ...snapshotPromises, ...tmaPromises, ...actionsPromises]);
           
           let offset = 0;
           const funnelResponses = res.slice(offset, offset + funnelPromises.length);
           offset += funnelPromises.length;
           
           const snapshotResponses = res.slice(offset, offset + snapshotPromises.length);
           offset += snapshotPromises.length;
           
           const tmaResponses = res.slice(offset, offset + tmaPromises.length);
           offset += tmaPromises.length;
           
           const actionsResponses = res.slice(offset, offset + actionsPromises.length);
           
           funnelRes = { 
             data: funnelResponses.flatMap(r => r.data || []), 
             error: funnelResponses.find(r => r.error)?.error || null 
           };
           snapshotRes = snapshotResponses;
           
           tmaData = tmaResponses.flatMap(r => r.data || []);
           actionsData = actionsResponses.flatMap(r => r.data || []);
        }

        const newRawData = {
          leadsData: leadsData || [],
          funnelRes,
          snapshotRes,
          tmaData,
          actionsData
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
        setRawData(null);
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
        let monthStr = lead.lead_data_cad;
        let sortKey = monthStr;
        if (typeof monthStr === 'string' && monthStr.length >= 7) {
          const parts = monthStr.substring(0, 10).split('-');
          if (parts.length >= 2) {
             const year = parts[0];
             const monthNum = parseInt(parts[1], 10);
             const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
             if (monthNum >= 1 && monthNum <= 12) {
                 monthStr = `${monthNames[monthNum - 1]} ${year}`;
                 sortKey = `${year}-${String(monthNum).padStart(2, '0')}`;
             }
          }
        }
        
        const displayDate = monthStr;
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
          if (etapa.toLowerCase().includes('ação') || etapa.toLowerCase().includes('acao')) return;

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

    const leadOriginMap = new Map<string, string>();
    let descartadosCount = 0;
    leadsData.forEach(l => {
      leadOriginMap.set(l.id, (l.origem || '').toLowerCase());
      if (l.status_atual?.toLowerCase().includes('descartad')) {
         descartadosCount++;
      }
    });

    const isAllowedVendaOrigin = (o: string) => {
      return o.includes('facebook') || o.includes('fb') || o.includes('meta') ||
             o.includes('insta') || o.includes('ig') || 
             o.includes('site') || o.includes('orgânico') || o.includes('organico') || o.includes('seo') ||
             o.includes('whatsapp') || o.includes('whats') || o.includes('wpp');
    };

    let rCount = 0;
    let pCount = 0;
    let vCount = 0;
    let aCount = 0;
    leadHottestStatus.forEach((score, leadId) => {
      if (score >= 4) {
        const origin = leadOriginMap.get(leadId) || '';
        if (isAllowedVendaOrigin(origin)) {
           rCount++;
        }
      }
      if (score >= 3) pCount++;
      if (score >= 2) vCount++;
      if (score >= 1) aCount++;
    });
    const hottestStatusData = { visita: vCount, agendamento: aCount, proposta: pCount, venda: rCount, descartado: descartadosCount };


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
      
      let monthStr = compData;
      if (typeof compData === 'string' && compData.length >= 7) {
        const parts = compData.substring(0, 10).split('-');
        if (parts.length >= 2) {
           const year = parts[0];
           const monthNum = parseInt(parts[1], 10);
           const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
           if (monthNum >= 1 && monthNum <= 12) {
               monthStr = `${monthNames[monthNum - 1]} ${year}`;
           }
        }
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
