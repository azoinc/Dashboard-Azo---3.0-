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

      const cacheKey = `dashboardCacheV2_${JSON.stringify({
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

        const startDateStrFull = formatYYYYMMDDStart(startDate);
        const endDateStrFull = formatYYYYMMDDEnd(endDate);

        // Determine Registration Date Bounds
        const startDateSimple = startDateStrFull.split('T')[0];
        const endDateSimple = endDateStrFull.split('T')[0];
        const endDateInclusive = endDateSimple + ' 23:59:59';
        const isTodoPeriodo = filters.period === 'Todo o período';

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

        const hasSpecificCompetences = filters.competences && filters.competences.length > 0 && !filters.competences.includes('Atual');

        // PHASE 1: Get the population of leads based on lead_milestones
        let milestonesQuery = supabase
          .from('lead_milestones')
          .select('lead_id, lead_nome, status, para_nome, lead_data_cad, origem, corretor, empreendimento, motivo_cancelamento, referencia_data, hora_referencia_data')
          .limit(50000);

        // ALWAYS apply registration date filter as requested
        milestonesQuery = (milestonesQuery as any)
          .gte('lead_data_cad', startDateSimple)
          .lte('lead_data_cad', endDateInclusive);

        // CRITICAL: We NO LONGER apply 'referencia_data' filter here.
        // The population is defined strictly by the registration date.
        // If hasSpecificCompetences is active, we use those leads' history and snapshots to show their state at that time.

        milestonesQuery = applyProjectFilter(milestonesQuery);
        if (filters.broker !== 'Todos') {
          milestonesQuery = (milestonesQuery as any).ilike('corretor', `%${filters.broker}%`);
        }

        const { data: milestonesData, error: milestonesError } = await milestonesQuery;
        if (milestonesError) throw milestonesError;

        const rawDataFromMilestones = milestonesData || [];
        console.log(`[Dashboard] Fetched ${rawDataFromMilestones.length} raw milestones for registration period`);

        if (rawDataFromMilestones.length === 0) {
           setRawData({
             leadsData: [],
             funnelRes: { data: [], error: null },
             snapshotRes: [],
             tmaData: [],
             actionsData: []
           });
           setLoading(false);
           return;
        }

        // PHASE 2: Deduplicate and build leads population
        // Group milestones by lead to find the latest state
        const milestonesByLead = new Map<string, any[]>();
        rawDataFromMilestones.forEach(m => {
          const lid = String(m.lead_id);
          if (!lid || lid === 'null' || lid === 'undefined') return;
          if (!milestonesByLead.has(lid)) milestonesByLead.set(lid, []);
          milestonesByLead.get(lid)!.push(m);
        });

        const leadsData: any[] = [];
        const syntheticFunnelData: any[] = [];

        // Sort helper for milestones (Latest first)
        const getLatestMilestone = (list: any[]) => {
          return [...list].sort((a, b) => {
            const dateA = a.referencia_data || '';
            const dateB = b.referencia_data || '';
            if (dateA !== dateB) return dateB.localeCompare(dateA);
            const timeA = a.hora_referencia_data || '';
            const timeB = b.hora_referencia_data || '';
            return timeB.localeCompare(timeA);
          })[0];
        };

        let excludedByMarketingCount = 0;

        for (const [lid, history] of milestonesByLead.entries()) {
          // CRITICAL: Check if this lead EVER had a marketing status in its history
          const hasMarketingHistory = history.some(item => {
            const st = String(item.status || item.para_nome || '').toLowerCase();
            // Match "ação de marketing", "acao de marketing", or simply contains "marketing"
            return st.includes('marketing') || st.includes('ação de marketing') || st.includes('acao de marketing');
          });

          if (hasMarketingHistory) {
            excludedByMarketingCount++;
            continue; // Completely exclude this lead from metrics
          }

          const latest = getLatestMilestone(history);
          if (!latest) continue;

          leadsData.push({
            status_atual: latest.status || latest.para_nome || 'Sem Status',
            id: lid,
            nome: latest.lead_nome,
            lead_data_cad: latest.lead_data_cad,
            origem: latest.origem,
            motivo_cancelamento: latest.motivo_cancelamento,
            corretor: latest.corretor,
            empreendimento: latest.empreendimento
          });

          // Build synthetic funnel based on history up to the selected period
          const reachedStages = new Set<string>();
          reachedStages.add('1. Total de Leads');
          
          // Determine the end date of the selected competencies to cap history
          let capDate = '9999-12-31';
          if (hasSpecificCompetences) {
            const dates = (filters.competences || []).map(c => new Date(c + "T00:00:00Z"));
            const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
            maxDate.setMonth(maxDate.getMonth() + 1);
            maxDate.setDate(0); 
            capDate = maxDate.toISOString().split('T')[0];
          }

          history.forEach(item => {
             const refDate = item.referencia_data || '';
             if (refDate > capDate) return; // Point-in-time cap

             const st = (item.status || item.para_nome || '').toLowerCase();
             // (Historical marketing exclusion is already handled above for the whole lead)

             if (!st.includes('aguardando')) reachedStages.add('2. Em Atendimento');
             if (st.match(/agendam|agendado|visita|proposta|negocia|venda/)) reachedStages.add('3. Agendamento');
             if (st.match(/visita|proposta|negocia|venda/)) reachedStages.add('4. Visita');
             if (st.match(/proposta|negocia|venda/)) reachedStages.add('5. Proposta/Negociação');
             if (st.match(/venda|contrato/)) reachedStages.add('6. Vendas');
          });

          reachedStages.forEach(stage => {
            syntheticFunnelData.push({ lead_id: lid, etapa_visual: stage });
          });
        }

        console.log(`[Dashboard] Final population: ${leadsData.length} unique leads (Excluded ${excludedByMarketingCount} leads with marketing history)`);


        let funnelRes = { data: [] as any[], error: null };
        let snapshotRes: any[] = [];
        let tmaData: any[] = [];
        let actionsData: any[] = [];

        if (leadsData.length > 0) {
           const leadIds = leadsData.map(l => l.id);
           const chunkSize = 1500;
           const allResults: any[] = [];
           
           const batches = [];
           for (let i = 0; i < leadIds.length; i += chunkSize) {
             batches.push(leadIds.slice(i, i + chunkSize));
           }

           console.time('[MetricsFetch]');
           // Sequential processing for metrics to avoid pooler exhaust during high volume
           for (const chunk of batches) {
             const chunkPromises: Promise<any>[] = [];
             
             if (!hasSpecificCompetences) {
               chunkPromises.push(supabase.from('view_funil_maximo_com_total').select('etapa_visual, lead_id').in('lead_id', chunk) as any);
             }
             chunkPromises.push(supabase.from('view_lead_snapshot_mensal').select('status_final_mes, competencia_data, lead_id').in('lead_id', chunk) as any);
             chunkPromises.push(supabase.from('view_tma_fila_atendimento').select('corretor, segundos_espera').in('lead_id', chunk) as any);
             chunkPromises.push(supabase.from('view_esforco_corretor').select('corretor, lead_id').in('lead_id', chunk) as any);

             const resList = await Promise.all(chunkPromises);
             allResults.push(...resList);
           }
           console.timeEnd('[MetricsFetch]');
           
           const resultsList = allResults;
           
           if (hasSpecificCompetences) {
             funnelRes = { data: syntheticFunnelData, error: null };
             // resultsList: [snapshot, tma, actions, snapshot, tma, actions...] (3 per chunk)
             snapshotRes = resultsList.filter((_, idx) => (idx % 3 === 0)); 
             tmaData = resultsList.filter((_, idx) => (idx % 3 === 1)).flatMap(r => r.data || []);
             actionsData = resultsList.filter((_, idx) => (idx % 3 === 2)).flatMap(r => r.data || []);
           } else {
             // resultsList: [funnel, snapshot, tma, actions, ...] (4 per chunk)
             const step = 4;
             funnelRes = { data: resultsList.filter((_, idx) => idx % step === 0).flatMap(r => r.data || []), error: null };
             snapshotRes = resultsList.filter((_, idx) => idx % step === 1);
             tmaData = resultsList.filter((_, idx) => idx % step === 2).flatMap(r => r.data || []);
             actionsData = resultsList.filter((_, idx) => idx % step === 3).flatMap(r => r.data || []);
           }
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
    
    // Check if competences (timestamps) are active
    const hasSpecificCompetences = filters.competences && filters.competences.length > 0 && !filters.competences.includes('Atual');

    let leadsData = rawData.leadsData as any[];

    // Point-in-time logic: If competence (timestamp) is selected, use status from end-of-month snapshot
    if (hasSpecificCompetences) {
        const selectedMonths = (filters.competences || []).map(c => c.substring(0, 7)).sort();
        const latestMonth = selectedMonths[selectedMonths.length - 1]; // Use the most recent selected month as the point-in-time reference

        const snapshotDataAll = rawData.snapshotRes.flatMap((res: any) => res.data || []);
        const pitStatusMap = new Map<string, string>();
        
        snapshotDataAll.forEach((row: any) => {
           if (row.competencia_data?.startsWith(latestMonth)) {
             pitStatusMap.set(String(row.lead_id), row.status_final_mes);
           }
        });

        leadsData = leadsData.map(l => {
           const pitStatus = pitStatusMap.get(String(l.id));
           // If we have a snapshot for that month, use it. 
           // If not, it means the lead might not have existed yet or was already finished/excluded in a way that left no snapshot.
           // However, if they entered in Jan and we view Jan, there should be a snapshot.
           return { ...l, status_atual: pitStatus || l.status_atual };
        });
    }

    // Optional: Filter out 'Ação de Marketing' row from final counts if needed
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
          const etapaLower = etapa.toLowerCase();
          if (etapaLower === 'ação de marketing' || etapaLower === 'acao de marketing') return;

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

    const selectedMonthStrings = hasSpecificCompetences ? (filters.competences || []).map(c => c.substring(0, 7)) : [];

    snapshotDataAll.forEach((row: any) => {
      const stringifiedLeadId = String(row.lead_id);
      if (!activeLeadIds.has(stringifiedLeadId)) return; // FILTER BY ACTIVE LEADS

      const status = row.status_final_mes || 'Sem Status';
      const statusLower = status.toLowerCase();
      if (statusLower === 'ação de marketing' || statusLower === 'acao de marketing') return; // exclude
      
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
