import React, { createContext, useContext, useState, useEffect } from 'react';
import { MonthData, ExpenseCategory, PUBLICIDADE_CATEGORIES, MANUTENCAO_STAND_CATEGORIES, Transaction, TransactionLog, City, Project, UserRole, PROJECTS_BY_CITY, ALL_PROJECTS, ProjectBudget, CommercialMetrics, CommercialRecord, TimelineEvent, SaleRecord } from '../types';
import { useAuth } from './AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { supabase } from '../lib/supabase';
import { matchProject, getCityForProject } from '../utils';

interface ExpenseContextType {
  data: MonthData[];
  selectedMonthId: string;
  setSelectedMonthId: (id: string) => void;
  updateBudget: (project: Project, budget: Partial<ProjectBudget>) => void;
  updateCommercialData: (project: Project, data: Partial<CommercialMetrics>, monthId?: string) => void;
  addCommercialMetrics: (project: Project, metrics: Partial<CommercialMetrics>, monthId: string) => void;
  addMonth: (year: number, month: number) => void;
  currentMonthData: MonthData | undefined;
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  logs: TransactionLog[];
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  addTransactions: (ts: Omit<Transaction, 'id'>[]) => void;
  updateTransactionAmount: (id: string, newAmount: number) => void;
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  commercialRecords: CommercialRecord[];
  filteredCommercialRecords: CommercialRecord[];
  addCommercialRecord: (record: Omit<CommercialRecord, 'id'>) => void;
  addCommercialRecords: (records: Omit<CommercialRecord, 'id'>[]) => void;
  deleteCommercialRecord: (id: string) => void;
  isCommercialModalOpen: boolean;
  setIsCommercialModalOpen: (isOpen: boolean) => void;
  userRole: UserRole | null;
  selectedCity: City | 'ALL';
  setSelectedCity: (city: City | 'ALL') => void;
  selectedProject: Project | 'ALL';
  setSelectedProject: (project: Project | 'ALL') => void;
  timelineEvents: TimelineEvent[];
  addTimelineEvent: (event: Omit<TimelineEvent, 'id'>) => void;
  deleteTimelineEvent: (id: string) => void;
  syncSupabaseData: () => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

const generateId = (year: number, month: number) => `${year}-${month.toString().padStart(2, '0')}`;

const getInitialData = (): MonthData[] => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentId = generateId(currentYear, currentMonth);

  const initialMonth: MonthData = {
    id: currentId,
    month: currentMonth,
    year: currentYear,
    budgets: ALL_PROJECTS.reduce((acc, p) => {
      acc[p] = { publicidade: 100000, stand: 50000, institucional: 20000, produtos: 0, vgv: 0, percentMkt: 0, percentManutStand: 0, percentProduto: 0, estoqueUnid: 0, metaVendas: 0 };
      return acc;
    }, {} as Record<string, ProjectBudget>),
    commercial: {}
  };
  return [initialMonth];
};

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<MonthData[]>(getInitialData);
  const [selectedMonthId, setSelectedMonthId] = useState<string>(`${new Date().getFullYear()}-ALL`);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCommercialModalOpen, setIsCommercialModalOpen] = useState(false);

  const { userRole, user } = useAuth();
  const [selectedCity, setSelectedCity] = useState<City | 'ALL'>('ALL');
  const [selectedProject, setSelectedProject] = useState<Project | 'ALL'>('ALL');

  const [commercialRecords, setCommercialRecords] = useState<CommercialRecord[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [logs, setLogs] = useState<TransactionLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from Firebase
  useEffect(() => {
    if (!user) return;

    const unsubscribeData = onSnapshot(doc(db, 'appData', 'data'), (doc) => {
      if (doc.exists()) {
        const parsed = doc.data().items || [];
        if (parsed.length > 0) {
          setData(parsed);
          if (!isLoaded) {
            const latestYear = parsed[0]?.year || new Date().getFullYear();
            setSelectedMonthId(`${latestYear}-ALL`);
          }
        }
      }
    });

    const unsubscribeTransactions = onSnapshot(doc(db, 'appData', 'transactions'), (doc) => {
      if (doc.exists()) {
        setTransactions(doc.data().items || []);
      }
    });

    const unsubscribeCommercial = onSnapshot(doc(db, 'appData', 'commercialRecords'), (doc) => {
      if (doc.exists()) {
        setCommercialRecords(doc.data().items || []);
      }
    });

    const unsubscribeTimeline = onSnapshot(doc(db, 'appData', 'timelineEvents'), (doc) => {
      if (doc.exists()) {
        setTimelineEvents(doc.data().items || []);
      }
    });

    const unsubscribeLogs = onSnapshot(doc(db, 'appData', 'logs'), (doc) => {
      if (doc.exists()) {
        setLogs(doc.data().items || []);
      }
      setIsLoaded(true);
    });

    return () => {
      unsubscribeData();
      unsubscribeTransactions();
      unsubscribeCommercial();
      unsubscribeTimeline();
      unsubscribeLogs();
    };
  }, [user]);

  // Save data to Firebase when it changes locally
  // We use a flag to prevent infinite loops from onSnapshot updates
  // Actually, since we are using onSnapshot, we should just update the state and then write to Firebase.
  // To avoid writing back what we just read, we can just use setDoc directly in the action functions,
  // but since we have a lot of state updates, we can use useEffect with a debounce or just write.
  // A better approach is to write to Firebase in the action functions, and let onSnapshot update the state.
  // But to keep it simple and avoid rewriting all functions, we can sync state to Firebase if it changed locally.
  // However, this might cause loops. Let's just write to Firebase whenever state changes.
  
  useEffect(() => {
    if (!isLoaded || !user) return;
    setDoc(doc(db, 'appData', 'data'), { items: data });
  }, [data, isLoaded, user]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    setDoc(doc(db, 'appData', 'transactions'), { items: transactions });
  }, [transactions, isLoaded, user]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    setDoc(doc(db, 'appData', 'logs'), { items: logs });
  }, [logs, isLoaded, user]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    setDoc(doc(db, 'appData', 'commercialRecords'), { items: commercialRecords });
  }, [commercialRecords, isLoaded, user]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    setDoc(doc(db, 'appData', 'timelineEvents'), { items: timelineEvents });
  }, [timelineEvents, isLoaded, user]);

  // RBAC Logic
  useEffect(() => {
    if (userRole === 'FUNCIONARIO_RJ' || userRole === 'COMERCIAL_RJ') {
      setSelectedCity('Rio de Janeiro');
      if (selectedProject !== 'ALL' && !PROJECTS_BY_CITY['Rio de Janeiro'].includes(selectedProject as any)) {
        setSelectedProject('ALL');
      }
    } else if (userRole === 'FUNCIONARIO_CAMPINAS' || userRole === 'COMERCIAL_CAMPINAS') {
      setSelectedCity('Campinas');
      if (selectedProject !== 'ALL' && !PROJECTS_BY_CITY['Campinas'].includes(selectedProject as any)) {
        setSelectedProject('ALL');
      }
    }
  }, [userRole, selectedProject]);

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...t,
      id: crypto.randomUUID(),
    };
    setTransactions(prev => [...prev, newTransaction]);
    
    const [year, month] = t.date.split('-');
    addMonth(parseInt(year), parseInt(month));
  };

  const addTransactions = (ts: Omit<Transaction, 'id'>[]) => {
    const newTransactions = ts.map(t => ({
      ...t,
      id: crypto.randomUUID(),
    }));
    setTransactions(prev => [...prev, ...newTransactions]);
    
    // Add unique months
    const uniqueMonths = new Set<string>();
    ts.forEach(t => {
      const [year, month] = t.date.split('-');
      uniqueMonths.add(`${year}-${month}`);
    });
    
    uniqueMonths.forEach(ym => {
      const [year, month] = ym.split('-');
      addMonth(parseInt(year), parseInt(month));
    });
  };

  const updateTransactionAmount = (id: string, newAmount: number) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        if (t.amount !== newAmount) {
          const log: TransactionLog = {
            id: crypto.randomUUID(),
            transactionId: t.id,
            timestamp: new Date().toISOString(),
            oldAmount: t.amount,
            newAmount: newAmount,
          };
          setLogs(l => [...l, log]);
        }
        return { ...t, amount: newAmount };
      }
      return t;
    }));
  };

  const isAllMonths = selectedMonthId.endsWith('-ALL');
  const selectedYear = selectedMonthId.split('-')[0];

  const currentMonthTransactions = isAllMonths
    ? transactions.filter(t => t.date.startsWith(selectedYear))
    : transactions.filter(t => t.date.startsWith(selectedMonthId));
  
  const filteredTransactions = currentMonthTransactions.filter(t => {
    if (selectedCity !== 'ALL' && t.city !== selectedCity) return false;
    if (selectedProject !== 'ALL' && t.project !== selectedProject) return false;
    return true;
  });

  const currentMonthCommercialRecords = isAllMonths
    ? commercialRecords.filter(r => r.date.startsWith(selectedYear))
    : commercialRecords.filter(r => r.date.startsWith(selectedMonthId));

  const filteredCommercialRecords = currentMonthCommercialRecords.filter(r => {
    if (selectedCity !== 'ALL' && r.city !== selectedCity) return false;
    if (selectedProject !== 'ALL' && r.project !== selectedProject) return false;
    return true;
  });

  const currentMonthData = isAllMonths
    ? (() => {
        const year = parseInt(selectedYear);
        const yearData = data.filter(m => m.year === year);
        if (yearData.length === 0) return undefined;
        
        const aggregatedBudgets: Record<string, ProjectBudget> = {};
        const aggregatedCommercial: Record<string, CommercialMetrics> = {};
        
        ALL_PROJECTS.forEach(p => {
          aggregatedBudgets[p] = {
            publicidade: yearData.reduce((sum, m) => sum + (m.budgets[p]?.publicidade || 0), 0),
            stand: yearData.reduce((sum, m) => sum + (m.budgets[p]?.stand || 0), 0),
            institucional: yearData.reduce((sum, m) => sum + (m.budgets[p]?.institucional || 0), 0),
            produtos: yearData.reduce((sum, m) => sum + (m.budgets[p]?.produtos || 0), 0),
            vgv: yearData.reduce((sum, m) => sum + (m.budgets[p]?.vgv || 0), 0),
            percentMkt: 0,
            percentManutStand: 0,
            percentProduto: 0,
            estoqueUnid: 0,
            metaVendas: yearData.reduce((sum, m) => sum + (m.budgets[p]?.metaVendas || 0), 0),
          };
          aggregatedCommercial[p] = {
            leads: yearData.reduce((sum, m) => sum + (m.commercial[p]?.leads || 0), 0),
            vendas: yearData.reduce((sum, m) => sum + (m.commercial[p]?.vendas || 0), 0),
            vgv: yearData.reduce((sum, m) => sum + (m.commercial[p]?.vgv || 0), 0),
            visitasOn: yearData.reduce((sum, m) => sum + (m.commercial[p]?.visitasOn || 0), 0),
            visitasOff: yearData.reduce((sum, m) => sum + (m.commercial[p]?.visitasOff || 0), 0),
          };
        });

        return {
          id: selectedMonthId,
          month: 13,
          year,
          budgets: aggregatedBudgets,
          commercial: aggregatedCommercial
        } as MonthData;
      })()
    : data.find(m => m.id === selectedMonthId);

  const updateBudget = (project: Project, budget: Partial<ProjectBudget>) => {
    setData(prev => prev.map(m => {
      if (m.id === selectedMonthId) {
        return {
          ...m,
          budgets: {
            ...m.budgets,
            [project]: { ...m.budgets[project], ...budget }
          }
        };
      }
      return m;
    }));
  };

  const updateCommercialData = (project: Project, commercialData: Partial<CommercialMetrics>, monthId?: string) => {
    const targetMonthId = monthId || selectedMonthId;
    setData(prev => prev.map(m => {
      if (m.id === targetMonthId) {
        const currentCommercial = m.commercial[project] || { leads: 0, vendas: 0, vgv: 0 };
        return {
          ...m,
          commercial: {
            ...m.commercial,
            [project]: { ...currentCommercial, ...commercialData }
          }
        };
      }
      return m;
    }));
  };

  const addCommercialMetrics = (project: Project, metrics: Partial<CommercialMetrics>, monthId: string) => {
    setData(prev => prev.map(m => {
      if (m.id === monthId) {
        const currentCommercial = m.commercial[project] || { leads: 0, vendas: 0, vgv: 0, visitasOn: 0, visitasOff: 0 };
        return {
          ...m,
          commercial: {
            ...m.commercial,
            [project]: { 
              ...currentCommercial, 
              vendas: currentCommercial.vendas + (metrics.vendas || 0),
              vgv: currentCommercial.vgv + (metrics.vgv || 0),
              leads: currentCommercial.leads + (metrics.leads || 0),
              visitasOn: currentCommercial.visitasOn + (metrics.visitasOn || 0),
              visitasOff: currentCommercial.visitasOff + (metrics.visitasOff || 0)
            }
          }
        };
      }
      return m;
    }));
  };

  const addCommercialRecord = (record: Omit<CommercialRecord, 'id'>) => {
    const newRecord = { ...record, id: Date.now().toString() } as CommercialRecord;
    setCommercialRecords(prev => [...prev, newRecord]);
  };

  const addCommercialRecords = (records: Omit<CommercialRecord, 'id'>[]) => {
    const newRecords = records.map((r, i) => ({ ...r, id: `${Date.now()}-${i}` } as CommercialRecord));
    setCommercialRecords(prev => [...prev, ...newRecords]);
  };

  const deleteCommercialRecord = (id: string) => {
    setCommercialRecords(prev => prev.filter(r => r.id !== id));
  };

  const addMonth = (year: number, month: number) => {
    const id = generateId(year, month);
    setData(prev => {
      if (!prev.find(m => m.id === id)) {
        const newMonth: MonthData = {
          id,
          month,
          year,
          budgets: ALL_PROJECTS.reduce((acc, p) => {
            acc[p] = { publicidade: 100000, stand: 50000, institucional: 20000, produtos: 0, vgv: 0, percentMkt: 0, percentManutStand: 0, percentProduto: 0, estoqueUnid: 0, metaVendas: 0 };
            return acc;
          }, {} as Record<string, ProjectBudget>),
          commercial: {}
        };
        return [...prev, newMonth].sort((a, b) => b.id.localeCompare(a.id));
      }
      return prev;
    });
    setSelectedMonthId(id);
  };

  const addTimelineEvent = (event: Omit<TimelineEvent, 'id'>) => {
    const newEvent: TimelineEvent = {
      ...event,
      id: crypto.randomUUID()
    };
    setTimelineEvents(prev => [...prev, newEvent]);
  };

  const deleteTimelineEvent = (id: string) => {
    setTimelineEvents(prev => prev.filter(e => e.id !== id));
  };

  const syncSupabaseData = async () => {
    if (!supabase) {
      console.warn('Supabase não está configurado.');
      return;
    }

    try {
      console.log('Iniciando busca de dados no Supabase (tabela vendas)...');
      const { data: vendasData, error } = await supabase
        .from('vendas')
        .select('*');

      if (error) {
        console.error('Erro retornado pelo Supabase:', error);
        throw error;
      }
      
      console.log('Dados brutos recebidos do Supabase:', vendasData);
      
      if (!vendasData || vendasData.length === 0) {
        console.log('Nenhum dado encontrado. Verifique se a tabela está vazia ou se o RLS está bloqueando a leitura.');
        return;
      }

      let finalRecords: CommercialRecord[] = [];
      let hasChanges = false;
      const seenSupabaseIds = new Set<string>();
      const requiredMonths = new Set<{year: number, month: number}>();
      let skippedCount = 0;

      setCommercialRecords(prevRecords => {
        const newRecords = [...prevRecords];
        
        vendasData.forEach((venda: any, index: number) => {
          const supabaseId = venda.id_venda?.toString() || venda.id_vendas?.toString() || venda.id?.toString() || venda.Id_vendas?.toString();
          if (!supabaseId) {
            console.warn(`Linha ${index} ignorada: Não possui 'id_venda' ou 'id'. Dados:`, venda);
            skippedCount++;
            return;
          }
          
          seenSupabaseIds.add(supabaseId);

          const projName = venda.empreendimento || '';
          const matchedProject = matchProject(projName);
          if (!matchedProject) {
            console.warn(`Linha ${index} (ID: ${supabaseId}) ignorada: Empreendimento '${projName}' não reconhecido. Dados:`, venda);
            skippedCount++;
            return;
          }

          let year: number;
          let month: number;
          let day: number = 1;
          
          if (typeof venda.data_venda === 'string' && venda.data_venda.includes('-')) {
            // Extrai YYYY-MM-DD diretamente da string para evitar problemas de fuso horário (timezone)
            // que fazem o dia 01/01 virar 31/12 do ano anterior no Brasil
            const parts = venda.data_venda.split('T')[0].split('-');
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            if (parts.length >= 3) {
              day = parseInt(parts[2], 10);
            }
          } else {
            const dateObj = new Date(venda.data_venda);
            if (isNaN(dateObj.getTime())) {
              console.warn(`Linha ${index} (ID: ${supabaseId}) ignorada: 'data_venda' inválida ou ausente. Valor: '${venda.data_venda}'. Dados:`, venda);
              skippedCount++;
              return;
            }
            year = dateObj.getUTCFullYear();
            month = dateObj.getUTCMonth() + 1;
            day = dateObj.getUTCDate();
          }
          const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          const city = getCityForProject(matchedProject);
          const vgvNominal = parseFloat(venda.valor_contrato) || 0;

          requiredMonths.add({ year, month });

          const recordIndex = newRecords.findIndex(r => r.supabaseId === supabaseId);
          
          const recordData: CommercialRecord = {
            id: recordIndex >= 0 ? newRecords[recordIndex].id : crypto.randomUUID(),
            supabaseId,
            date: dateStr,
            city,
            project: matchedProject,
            type: 'venda',
            vendas: '1',
            qtde: 1,
            unidade: venda.unidade || '',
            vgvNominal,
            vgvVp: vgvNominal,
            ev: 0,
            origem: venda.imobiliaria || '',
            status1: venda.status || '',
            status2: venda.corretor || ''
          } as SaleRecord;

          if (recordIndex >= 0) {
            // Check if it changed
            const existing = newRecords[recordIndex] as SaleRecord;
            if (
              existing.project !== recordData.project ||
              existing.date !== recordData.date ||
              existing.vgvNominal !== (recordData as SaleRecord).vgvNominal ||
              existing.unidade !== (recordData as SaleRecord).unidade ||
              existing.status1 !== (recordData as SaleRecord).status1
            ) {
              newRecords[recordIndex] = recordData;
              hasChanges = true;
            }
          } else {
            // Add new
            newRecords.push(recordData);
            hasChanges = true;
          }
        });

        console.log(`Processamento concluído. ${vendasData.length - skippedCount} registros válidos, ${skippedCount} ignorados.`);

        // Remove records that exist in Firebase with a supabaseId but are no longer in Supabase
        const filteredRecords = newRecords.filter(r => {
          if (r.supabaseId && !seenSupabaseIds.has(r.supabaseId)) {
            hasChanges = true;
            return false;
          }
          return true;
        });

        finalRecords = filteredRecords;
        return hasChanges ? filteredRecords : prevRecords;
      });

      if (hasChanges) {
        // Recalculate metrics for all months and projects
        setData(prevData => {
          let newData = [...prevData];
          
          // Ensure all required months exist
          requiredMonths.forEach(({year, month}) => {
            const id = generateId(year, month);
            if (!newData.find(m => m.id === id)) {
              newData.push({
                id,
                year,
                month,
                budgets: ALL_PROJECTS.reduce((acc, p) => {
                  acc[p] = { publicidade: 100000, stand: 50000, institucional: 20000, produtos: 0, vgv: 0, percentMkt: 0, percentManutStand: 0, percentProduto: 0, estoqueUnid: 0, metaVendas: 0 };
                  return acc;
                }, {} as Record<string, ProjectBudget>),
                commercial: {}
              });
            }
          });
          
          newData.sort((a, b) => b.id.localeCompare(a.id));

          return newData.map(monthData => {
            const monthRecords = finalRecords.filter(r => r.date.startsWith(monthData.id));
            
            const newCommercial = { ...monthData.commercial };
            
            // Reset vendas and vgv for all projects in this month
            Object.keys(newCommercial).forEach(proj => {
              newCommercial[proj as Project] = {
                ...newCommercial[proj as Project],
                vendas: 0,
                vgv: 0
              };
            });

            // Recalculate from records
            monthRecords.forEach(record => {
              if (record.type === 'venda') {
                const sale = record as SaleRecord;
                if (!newCommercial[sale.project]) {
                  newCommercial[sale.project] = { leads: 0, vendas: 0, vgv: 0, visitasOn: 0, visitasOff: 0 };
                }
                newCommercial[sale.project].vendas += sale.qtde;
                newCommercial[sale.project].vgv += sale.vgvNominal;
              }
            });

            return {
              ...monthData,
              commercial: newCommercial
            };
          });
        });
      }

    } catch (error) {
      console.error('Error syncing Supabase data:', error);
      throw error;
    }
  };

  // Run initial sync on load
  useEffect(() => {
    if (isLoaded && user) {
      syncSupabaseData().catch(console.error);
    }
  }, [isLoaded, user]);

  return (
    <ExpenseContext.Provider value={{ 
      data, selectedMonthId, setSelectedMonthId, updateBudget, updateCommercialData, addCommercialMetrics, addMonth, currentMonthData,
      transactions, filteredTransactions, logs, addTransaction, addTransactions, updateTransactionAmount, isModalOpen, setIsModalOpen,
      commercialRecords, filteredCommercialRecords, addCommercialRecord, addCommercialRecords, deleteCommercialRecord, isCommercialModalOpen, setIsCommercialModalOpen,
      userRole, selectedCity, setSelectedCity, selectedProject, setSelectedProject,
      timelineEvents, addTimelineEvent, deleteTimelineEvent, syncSupabaseData
    }}>
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpense = () => {
  const context = useContext(ExpenseContext);
  if (!context) throw new Error('useExpense must be used within ExpenseProvider');
  return context;
};
