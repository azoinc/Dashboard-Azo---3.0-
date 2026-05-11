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
  competences?: string[];
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
    let aborted = false;

    async function fetchData() {
      if (!supabase) {
        if (!aborted) {
          setError('Supabase client not initialized');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      const cacheKey = `dashboardCacheV3_${JSON.stringify({
        period: filters.period,
        project: filters.project,
        broker: filters.broker,
        competences: filters.competences,
        startDate: filters.startDate,
        endDate: filters.endDate,
        city: filters.city
      })}`;

      try {
        const cachedRawData = await localforage.getItem(cacheKey);
        if (aborted) return;
        if (cachedRawData) {
          setRawData(cachedRawData);
          setLoading(false);
        } else {
          setRawData(null);
        }
      } catch (e) {
        console.error('Cache read error', e);
        if (!aborted) setRawData(null);
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
        let rawLeadsData: any[] = [];
        const hasSpecificCompetences = filters.competences && filters.competences.length > 0 && !filters.competences.includes('Atual');

        if (hasSpecificCompetences) {
           // Find min and max dates across selected competences
           const dates = (filters.competences || []).map(c => new Date(c + "T00:00:00Z"));
           const compStartDate = new Date(Math.min(...dates.map(d => d.getTime())));
           const compEndDate = new Date(Math.max(...dates.map(d => d.getTime())));
           compEndDate.setMonth(compEndDate.getMonth() + 1);
           compEndDate.setDate(0); // Last day of the month

           const compStartStr = compStartDate.toISOString().split('T')[0];
           const compEndStr = compEndDate.toISOString().split('T')[0];

           const { data: snapIds, error: snapErr } = await supabase
             .from('view_lead_snapshot_mensal')
             .select('lead_id')
             .gte('competencia_data', compStartStr)
             .lte('competencia_data', compEndStr);

           if (snapErr) throw snapErr;

           const validLeadIds = Array.from(new Set(snapIds?.map((r: any) => r.lead_id).filter(id => id != null)));

           if (validLeadIds.length > 0) {
              const chunkSize = 1000;
              for (let i = 0; i < validLeadIds.length; i += chunkSize) {
                 const chunk = validLeadIds.slice(i, i + chunkSize);
                 let leadsQuery = supabase
                   .from('leads')
                   .select('status_atual, nome, id_cv, data_criacao_cv, origem, motivo_cancelamento, corretor, empreendimento')
                   .in('id_cv', chunk)
                   .gte('data_criacao_cv', startDateStr)
                   .lte('data_criacao_cv', endDateStr);

                 leadsQuery = applyProjectFilter(leadsQuery);
                 if (filters.broker !== 'Todos') {
                   leadsQuery = leadsQuery.ilike('corretor', `%${filters.broker}%`);
                 }

                 const { data, error } = await leadsQuery;
                 if (error) throw error;
                 if (data) rawLeadsData.push(...data);
              }
           }
        } else {
           let leadsQuery = supabase
             .from('leads')
             .select('status_atual, nome, id_cv, data_criacao_cv, origem, motivo_cancelamento, corretor, empreendimento')
             .gte('data_criacao_cv', startDateStr)
             .lte('data_criacao_cv', endDateStr);

           leadsQuery = applyProjectFilter(leadsQuery);
           if (filters.broker !== 'Todos') {
             leadsQuery = leadsQuery.ilike('corretor', `%${filters.broker}%`);
           }

           const { data: leadsRes, error: leadsErr } = await leadsQuery;
           if (leadsErr) throw leadsErr;
           if (leadsRes) rawLeadsData = leadsRes;
        }

        // Simplify exclusions: Just rely on current leads data to exclude "ação"
        const excludedLeadIds = new Set<string>();
        if (rawLeadsData) {
          rawLeadsData.forEach((r: any) => {
            let isExcluded = false;
            const terms = [
              String(r.status_atual || '').toLowerCase(),
              String(r.motivo_cancelamento || '').toLowerCase(),
              String(r.origem || '').toLowerCase()
            ];
            for (const term of terms) {
              if (term.includes('ação') || term.includes('acao')) {
                isExcluded = true;
                break;
              }
            }
            if (isExcluded && r.id_cv) excludedLeadIds.add(String(r.id_cv));
          });
        }

        leadsData = (rawLeadsData || [])
           .filter((item: any) => !excludedLeadIds.has(String(item.id_cv)))
           .map((item: any) => ({
             status_atual: item.status_atual,
             id: String(item.id_cv),
             nome: item.nome,
             lead_data_cad: item.data_criacao_cv,
             origem: item.origem,
             motivo_cancelamento: item.motivo_cancelamento,
             corretor: item.corretor,
             empreendimento: item.empreendimento
           }));

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
               supabase.from('view_lead_snapshot_mensal').select('status_final_mes, competencia_data, lead_id').in('lead_id', chunk)
             );
             funnelPromises.push(
               supabase.from('view_funil_maximo_com_total').select('etapa_visual, lead_id').in('lead_id', chunk)
             );
             tmaPromises.push(
               supabase.from('view_tma_fila_atendimento').select('corretor, segundos_espera').in('lead_id', chunk)
             );
             actionsPromises.push(
               supabase.from('view_esforco_corretor').select('corretor, lead_id').in('lead_id', chunk)
             );
           }

           const res = await Promise.all([...funnelPromises, ...snapshotPromises, ...tmaPromises, ...actionsPromises]);
           
           let offset = 0;
           const funnelResponses = res.slice(offset, offset + funnelPromises.length); offset += funnelPromises.length;
           const snapshotResponses = res.slice(offset, offset + snapshotPromises.length); offset += snapshotPromises.length;
           const tmaResponses = res.slice(offset, offset + tmaPromises.length); offset += tmaPromises.length;
           const actionsResponses = res.slice(offset, offset + actionsPromises.length);
           
           const allSnapshots = snapshotResponses.flatMap(r => r.data || []);
           
           if (hasSpecificCompetences) {
             const selectedMonthStrings = (filters.competences || []).map(c => c.substring(0, 7)); // YYYY-MM
             
             const validLeadsFromSnapshots = new Map<string, string>(); // lead_id -> latest status_final_mes
             allSnapshots.forEach((snap: any) => {
                const snapMonth = snap.competencia_data?.substring(0, 7);
                if (snapMonth && selectedMonthStrings.includes(snapMonth)) {
                   const leadIdStr = String(snap.lead_id);
                   const st = String(snap.status_final_mes || '').toLowerCase();
                   if (!st.includes('ação') && !st.includes('acao')) {
                     validLeadsFromSnapshots.set(leadIdStr, snap.status_final_mes); 
                   }
                }
             });

             leadsData = leadsData.filter(l => validLeadsFromSnapshots.has(String(l.id))).map(l => ({
               ...l,
               status_atual: validLeadsFromSnapshots.get(String(l.id)) || l.status_atual
             }));
           }
           
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

        if (aborted) return;
        setRawData(newRawData);

        try {
          await localforage.setItem(cacheKey, newRawData);
        } catch (e) {
          console.error("Cache write error", e);
        }

      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        if (!aborted) {
          setError(err.message || 'Erro ao carregar dados do dashboard');
          setRawData(null);
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    fetchData();

    return () => { aborted = true; };
  }, [filters.period, filters.project, filters.broker, JSON.stringify(filters.competences), filters.startDate, filters.endDate, filters.city]); // Omit interactive filters to prevent refetching

  const computed = useMemo(() => {
    if (!rawData) {
      return {
        statusData: [], funnelData: [], stackedStatusData: [], availableMonths: [],
        brokerTimeData: [], brokerActionsData: [], originData: [], cancelReasons: [],
        brokerLeads: [], lineData: [], lineChartKeys: [], totalLeads: 0,
        hottestStatusData: { visita: 0, agendamento: 0, proposta: 0, venda: 0 },
        hottestLeadsList: []
      };
    }
    
    let leadsData = rawData.leadsData as any[];

    // Exclude 'Ação de Marketing' entirely from the dashboard metrics
    leadsData = leadsData.filter(l => {
      const status = (l.status_atual || '').toLowerCase();
      return !status.includes('ação') && !status.includes('acao');
    });
    
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
    const activeLeadIds = new Set(leadsData.map(l => String(l.id)));

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
        const leadId = String(row.lead_id);
        if (!activeLeadIds.has(leadId)) return; // FILTER BY ACTIVE LEADS
        
        const etapa = row.etapa_visual;
        if (etapa && leadId && leadId !== 'null' && leadId !== 'undefined') {
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
    const totalLeads = leadsData.length;

    const leadOriginMap = new Map<string, string>();
    let descartadosCount = 0;
    leadsData.forEach(l => {
      leadOriginMap.set(String(l.id), (l.origem || '').toLowerCase());
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
    
    const hottestLeadsList: any[] = [];

    leadsData.forEach(lead => {
      const score = leadHottestStatus.get(String(lead.id)) || 0;
      if (score >= 4) {
        if (isAllowedVendaOrigin(lead.origin_treated)) {
           rCount++;
        }
      }
      if (score >= 3) pCount++;
      if (score >= 2) vCount++;
      if (score >= 1) aCount++;
      
      if (score >= 1) {
        let maxStep = 'Agendamento';
        if (score === 2) maxStep = 'Visita';
        if (score === 3) maxStep = 'Proposta';
        if (score === 4) maxStep = 'Venda';
        
        hottestLeadsList.push({
          id: lead.id,
          nome: lead.nome || 'Sem Nome',
          empreendimento: lead.empreendimento,
          corretor: lead.corretor,
          maxStep,
          data_entrada: lead.lead_data_cad,
          status_atual: lead.status_atual
        });
      }
    });

    const hottestStatusData = { visita: vCount, agendamento: aCount, proposta: pCount, venda: rCount, descartado: descartadosCount };


    // Snapshots Processing
    const snapshotDataAll = rawData.snapshotRes.flatMap((res: any) => res.data || []);
    const stackedDataMap = new Map<string, Map<string, Set<string>>>();
    const monthsSet = new Set<string>();
    const monthRawMap = new Map<string, string>();

    const hasSpecificCompetences = filters.competences && filters.competences.length > 0 && !filters.competences.includes('Atual');
    const selectedMonthStrings = hasSpecificCompetences ? (filters.competences || []).map(c => c.substring(0, 7)) : [];

    snapshotDataAll.forEach((row: any) => {
      const stringifiedLeadId = String(row.lead_id);
      if (!activeLeadIds.has(stringifiedLeadId)) return; // FILTER BY ACTIVE LEADS

      const status = row.status_final_mes || 'Sem Status';
      if (status.toLowerCase().includes('ação') || status.toLowerCase().includes('acao')) return; // exclude
      
      if (activeFilter.status && status !== activeFilter.status) return; // INTERACTIVE STATUS FILTER

      const compData = row.competencia_data;
      if (!compData) return;
      
      if (hasSpecificCompetences) {
        const rawMonthStr = compData.substring(0, 7);
        if (!selectedMonthStrings.includes(rawMonthStr)) return;
      }
      
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
      if (row.lead_id) statusMonths.get(monthStr)!.add(stringifiedLeadId);
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
      hottestStatusData, hottestLeadsList
    };
  }, [rawData, filters.interactiveFilters]);

  return {
    loading,
    error,
    ...computed
  };
}
