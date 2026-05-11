import React, { useMemo } from 'react';
import { useExpense } from '../context/ExpenseContext';
import { PUBLICIDADE_CATEGORIES, MANUTENCAO_STAND_CATEGORIES, INSTITUCIONAL_CATEGORIES, PROJECTS_BY_CITY, ALL_PROJECTS } from '../types';
import { formatCurrency, MONTHS } from '../utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ComposedChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Target, Users, ShoppingCart, Percent, Activity } from 'lucide-react';
import { allCommercialProjects } from '../data/commercialProjects';
import { useInternoDashboard } from '../hooks/useInternoDashboard';
import { useSiengeIntegration } from '../hooks/useSiengeIntegration';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

const getCommercialProject = (p: string) => {
  return allCommercialProjects.find(cp => 
    cp.name.toLowerCase().includes(p.toLowerCase()) || 
    p.toLowerCase().includes(cp.name.toLowerCase()) ||
    (p === 'A Noite' && cp.name === 'Noite') ||
    (p === 'Ipanema' && cp.name === 'Ar Ipanema') ||
    (p === 'Gávea' && cp.name === 'Gávea 99') ||
    (p === 'Ares' && cp.name === 'Ares Home') ||
    (p === 'Verter' && cp.name === 'Verter Cambuí') ||
    (p === 'Natus' && cp.name === 'Natus Home')
  );
};

const PROJECT_COLORS: Record<string, string> = {
  'Gávea': 'bg-emerald-500',
  'Ipanema': 'bg-blue-500',
  'Insigna': 'bg-amber-500',
  'A Noite': 'bg-rose-500',
  'Ares': 'bg-indigo-500',
  'Verter': 'bg-purple-500',
  'Casa da Mata': 'bg-pink-500',
  'Natus': 'bg-cyan-500'
};

export default function Dashboard() {
  const { data, currentMonthData, selectedCity, selectedProject, filteredTransactions, transactions, timelineEvents, selectedMonthId, filteredCommercialRecords, salesGoals, selectedYear } = useExpense();

  const isAllMonths = selectedMonthId.endsWith('-ALL');
  const [yearStr, monthStr] = selectedMonthId.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);

  const dashboardFilters = useMemo(() => {
    let period = 'Personalizado';
    let startDate = '';
    let endDate = '';

    if (isAllMonths) {
      if (yearStr === 'ALL') {
        period = 'Todo o período';
      } else {
        startDate = `${year}-01-01`;
        endDate = `${year}-12-31`;
      }
    } else {
      startDate = `${year}-${monthStr}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${year}-${monthStr}-${lastDay.toString().padStart(2, '0')}`;
    }

    return {
      period,
      startDate,
      endDate,
      project: selectedProject === 'ALL' ? 'Todos' : selectedProject,
      city: selectedCity,
      broker: 'Todos',
      competence: 'Atual'
    };
  }, [selectedMonthId, selectedProject, selectedCity, isAllMonths, yearStr, monthStr, year, month]);

  const { totalLeads: fetchedLeads, hottestStatusData } = useInternoDashboard(dashboardFilters);
  const siengeData = useSiengeIntegration(dashboardFilters.startDate, dashboardFilters.endDate);

  if (!currentMonthData) return <div>Carregando...</div>;

  const totalPublicidade = PUBLICIDADE_CATEGORIES.reduce((acc, cat) => acc + filteredTransactions.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0), 0);
  const totalStand = MANUTENCAO_STAND_CATEGORIES.reduce((acc, cat) => acc + filteredTransactions.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0), 0);
  const totalInstitucional = INSTITUCIONAL_CATEGORIES.reduce((acc, cat) => acc + filteredTransactions.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0), 0);
  const totalProdutos = filteredTransactions.filter(t => t.category === 'PRODUTOS GERAIS').reduce((sum, t) => sum + t.amount, 0);
  const totalGasto = totalPublicidade + totalStand + totalInstitucional + totalProdutos;

  let budgetPub = 0;
  let budgetStand = 0;
  let budgetInst = 0;
  let budgetProdutos = 0;
  let totalLeads = fetchedLeads || 0;
  let totalVendas = 0;
  let totalVGV = 0;
  let totalVgvProduto = 0;
  let totalEstoque = 0;
  let totalMetaVendas = 0;
  let totalVisitasOn = hottestStatusData?.visita || 0;
  let totalVisitasOff = 0;

  const projectsToInclude = selectedProject !== 'ALL' 
    ? [selectedProject] 
    : selectedCity !== 'ALL' 
      ? PROJECTS_BY_CITY[selectedCity] 
      : ALL_PROJECTS;

  filteredCommercialRecords.forEach(r => {
    if (projectsToInclude.includes(r.project)) {
      if (r.type === 'venda') {
        totalVendas += r.qtde || 0;
        totalVGV += r.vgvNominal || 0;
      }
    }
  });

  projectsToInclude.forEach(p => {
    const b = currentMonthData.budgets[p];
    if (b) {
      budgetPub += b.publicidade || 0;
      budgetStand += b.stand || 0;
      budgetInst += b.institucional || 0;
      budgetProdutos += b.produtos || 0;
    }
    
    let commProjTargetVgv = 0;
    let commProjTargetUnid = 0;
    let commProjTotalUnid = 0;

    const yearGoal = salesGoals.find((g) => g.year === selectedYear);
    if (yearGoal) {
      const match = yearGoal.projects.find((pg) => {
        const pn = p.toLowerCase();
        const gn = pg.name.toLowerCase();
        return pn.includes(gn) || gn.includes(pn) || 
               (p === 'A Noite' && pg.name === 'Noite') ||
               (p === 'Ipanema' && pg.name === 'Ar Ipanema') ||
               (p === 'Gávea' && pg.name === 'Gávea 99') ||
               (p === 'Ares' && pg.name === 'Ares Home') ||
               (p === 'Verter' && pg.name === 'Verter Cambuí') ||
               (p === 'Natus' && pg.name === 'Natus Home');
      });
      if (match) {
        commProjTargetVgv = match.target?.vgv || 0;
        commProjTargetUnid = match.target?.unid || 0;
        commProjTotalUnid = (match.q1?.unid || 0) + (match.q2?.unid || 0) + (match.q3?.unid || 0) + (match.q4?.unid || 0);
      }
    }

    totalVgvProduto += commProjTargetVgv;
    totalEstoque += commProjTargetUnid;
    totalMetaVendas += commProjTotalUnid;

    const comm = currentMonthData.commercial[p];
    if (comm) {
      totalVisitasOff += comm.visitasOff || 0;
    }
  });

  const totalPrevisto = budgetPub + budgetStand + budgetInst + budgetProdutos;
  const taxaConversao = totalLeads > 0 ? (totalVendas / totalLeads) * 100 : 0;
  const leadsPorVenda = totalVendas > 0 ? totalLeads / totalVendas : 0;

  const saldoPub = budgetPub - totalPublicidade;
  const percentualPub = budgetPub > 0 ? (totalPublicidade / budgetPub) * 100 : 0;

  const saldoStand = budgetStand - totalStand;
  const percentualStand = budgetStand > 0 ? (totalStand / budgetStand) * 100 : 0;

  const pieData = [
    { name: 'Publicidade', value: totalPublicidade },
    { name: 'Stand', value: totalStand },
    { name: 'Institucional', value: totalInstitucional }
  ].filter(d => d.value > 0);

  const barData = PUBLICIDADE_CATEGORIES.map(cat => ({
    name: cat,
    valor: filteredTransactions.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0)
  })).filter(d => d.valor > 0).sort((a, b) => b.valor - a.valor);

  const comboData = data.slice().reverse().map(m => {
    let mLeads = 0;
    let mInvestido = 0;
    let mPrevisto = 0;
    
    projectsToInclude.forEach(p => {
      mLeads += m.commercial[p]?.leads || 0;
      mPrevisto += (m.budgets[p]?.publicidade || 0) + (m.budgets[p]?.stand || 0) + (m.budgets[p]?.institucional || 0);
    });

    const mTransactions = transactions.filter(t => t.date.startsWith(m.id)).filter(t => {
      if (selectedCity !== 'ALL' && t.city !== selectedCity) return false;
      if (selectedProject !== 'ALL' && t.project !== selectedProject) return false;
      return true;
    });
    mInvestido = mTransactions.reduce((sum, t) => sum + t.amount, 0);

    return {
      name: MONTHS[m.month - 1].substring(0, 3),
      leads: mLeads,
      investido: mInvestido,
      previsto: mPrevisto
    };
  });

  // Trend logic (comparing to previous month if exists)
  const currentIndex = data.findIndex(m => m.id === currentMonthData.id);
  const prevMonthData = data[currentIndex + 1]; // assuming sorted desc
  let trend = 0;
  if (prevMonthData) {
    const prevTransactions = data[currentIndex + 1] ? 
      data[currentIndex + 1].id // Wait, we need transactions from previous month to filter correctly.
      // For simplicity, let's just use the raw expenses if we don't have filtered past transactions easily available.
      // Actually, since we have all transactions in context, let's filter them.
      : null;
  }
  
  // Let's rewrite trend logic to use filtered transactions
  if (prevMonthData) {
    const prevMonthTransactions = transactions.filter(t => t.date.startsWith(prevMonthData.id)).filter(t => {
      if (selectedCity !== 'ALL' && t.city !== selectedCity) return false;
      if (selectedProject !== 'ALL' && t.project !== selectedProject) return false;
      return true;
    });
    const prevTotal = prevMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
    if (prevTotal > 0) {
      trend = ((totalGasto - prevTotal) / prevTotal) * 100;
    }
  }

  const currentMonthEvents = isAllMonths ? [] : timelineEvents.filter(e => e.date.startsWith(selectedMonthId)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const daysInMonth = isAllMonths ? 0 : new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Marketing</h2>
          <p className="text-slate-500 mt-1">
            Visão geral de {MONTHS[currentMonthData.month - 1]} de {currentMonthData.year}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${trend <= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
              {trend <= 0 ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">vs Mês Anterior</p>
              <p className={`text-sm font-bold ${trend <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-[#61072E] rounded-2xl p-4 shadow-sm text-white flex flex-col justify-center items-center text-center">
          <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-1">VGV do Produto</p>
          <p className="text-[0.8rem] font-bold">{formatCurrency(totalVgvProduto)}</p>
        </div>
        <div className="bg-[#61072E] rounded-2xl p-4 shadow-sm text-white flex flex-col justify-center items-center text-center">
          <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-1">VGV em Estoque</p>
          <p className="text-[0.8rem] font-bold">
            {formatCurrency(siengeData?.vgvEstoque || 0)}
          </p>
        </div>
        <div className="bg-[#61072E] rounded-2xl p-4 shadow-sm text-white flex flex-col justify-center items-center text-center relative">
          <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-1">VGV Realizado</p>
          <p className="text-[0.8rem] font-bold">
            {formatCurrency(totalVGV)}
          </p>
        </div>
        <div className="bg-[#61072E] rounded-2xl p-4 shadow-sm text-white flex flex-col justify-center items-center text-center">
          <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-1">Meta de Vendas</p>
          <p className="text-[0.8rem] font-bold">{totalMetaVendas} unid.</p>
        </div>
        <div className="bg-[#61072E] rounded-2xl p-4 shadow-sm text-white flex flex-col justify-center items-center text-center relative">
          <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-1">Vendas Realizadas</p>
          <p className="text-[0.8rem] font-bold">
            {`${totalVendas} unid.`}
          </p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-4 shadow-sm text-white flex flex-col justify-center items-center text-center">
          <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-1">Investimento MKT</p>
          <p className="text-[0.8rem] font-bold">{formatCurrency(totalPublicidade + totalInstitucional)}</p>
        </div>
        <div className="bg-slate-800 rounded-2xl p-4 shadow-sm text-white flex flex-col justify-center items-center text-center">
          <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-1">Investimento Stand</p>
          <p className="text-[0.8rem] font-bold">{formatCurrency(totalStand)}</p>
        </div>
        <div className="bg-slate-800 rounded-2xl p-4 shadow-sm text-white flex flex-col justify-center items-center text-center">
          <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-1">Investimento Produto</p>
          <p className="text-[0.8rem] font-bold">{formatCurrency(totalProdutos)}</p>
        </div>
        <div className="bg-slate-800 rounded-2xl p-4 shadow-sm text-white flex flex-col justify-center items-center text-center">
          <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-1">Estoque de Unid.</p>
          <p className="text-[0.8rem] font-bold">{totalEstoque} unid.</p>
        </div>
      </div>

      {/* Middle Section: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Origem x Investimento</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tickFormatter={(value) => `R$ ${value / 1000}k`} stroke="#64748b" />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="valor" fill="#10b981" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Planejado x Realizado</h3>
          <div className="space-y-6">
            {projectsToInclude.map(p => {
              const pBudgetPub = currentMonthData.budgets[p]?.publicidade || 0;
              const pInvestidoPub = filteredTransactions.filter(t => t.project === p && PUBLICIDADE_CATEGORIES.includes(t.category)).reduce((sum, t) => sum + t.amount, 0);
              const pPercentPub = pBudgetPub > 0 ? (pInvestidoPub / pBudgetPub) * 100 : 0;

              const pBudgetStand = currentMonthData.budgets[p]?.stand || 0;
              const pInvestidoStand = filteredTransactions.filter(t => t.project === p && MANUTENCAO_STAND_CATEGORIES.includes(t.category)).reduce((sum, t) => sum + t.amount, 0);
              const pPercentStand = pBudgetStand > 0 ? (pInvestidoStand / pBudgetStand) * 100 : 0;
              
              if (pBudgetPub === 0 && pInvestidoPub === 0 && pBudgetStand === 0 && pInvestidoStand === 0) return null;

              return (
                <div key={p} className="space-y-3">
                  <div className="font-bold text-slate-800 border-b border-slate-100 pb-1">{p}</div>
                  
                  {(pBudgetPub > 0 || pInvestidoPub > 0) && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-600">Publicidade</span>
                        <span className="text-slate-500">{formatCurrency(pInvestidoPub)} / {formatCurrency(pBudgetPub)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                        <div 
                          className={`h-full ${pPercentPub > 100 ? 'bg-rose-500' : pPercentPub > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${Math.min(pPercentPub, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {(pBudgetStand > 0 || pInvestidoStand > 0) && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-600">Manut. Stand</span>
                        <span className="text-slate-500">{formatCurrency(pInvestidoStand)} / {formatCurrency(pBudgetStand)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                        <div 
                          className={`h-full ${pPercentStand > 100 ? 'bg-rose-500' : pPercentStand > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${Math.min(pPercentStand, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 4 KPIs */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={20} /></div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Leads</p>
            </div>
            <p className="text-[0.8rem] font-bold text-slate-900">{totalLeads.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Activity size={20} /></div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Visitas On</p>
            </div>
            <p className="text-[0.8rem] font-bold text-slate-900">{totalVisitasOn}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Activity size={20} /></div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Visitas Off</p>
            </div>
            <p className="text-[0.8rem] font-bold text-slate-900">{totalVisitasOff}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Percent size={20} /></div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Conversão</p>
            </div>
            <p className="text-[0.8rem] font-bold text-slate-900">{taxaConversao.toFixed(1)}%</p>
          </div>
        </div>

        {/* Combo Chart */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Evolução: Leads x Investimento</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={comboData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={12} tickFormatter={(val) => `R$${val/1000}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="investido" name="Investimento Realizado" fill="#61072E" radius={[4, 4, 0, 0]} />
                <Line yAxisId="left" type="monotone" dataKey="previsto" name="Investimento Previsto" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="leads" name="Número de Leads" stroke="#10b981" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tables */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">Previsão (Orçamentos)</h3>
            </div>
            <div className="overflow-y-auto max-h-40">
              <table className="w-full text-left text-xs">
                <thead className="bg-white sticky top-0">
                  <tr className="text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-2 font-medium">Empreendimento</th>
                    <th className="px-4 py-2 font-medium text-right">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectsToInclude.map(p => {
                    const val = (currentMonthData.budgets[p]?.publicidade || 0) + (currentMonthData.budgets[p]?.stand || 0) + (currentMonthData.budgets[p]?.institucional || 0) + (currentMonthData.budgets[p]?.produtos || 0);
                    if (val === 0) return null;
                    return (
                      <tr key={p} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-700">{p}</td>
                        <td className="px-4 py-2 text-right text-slate-900">{formatCurrency(val)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">Realizado (Lançamentos)</h3>
            </div>
            <div className="overflow-y-auto max-h-40">
              <table className="w-full text-left text-xs">
                <thead className="bg-white sticky top-0">
                  <tr className="text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-2 font-medium">Empreendimento</th>
                    <th className="px-4 py-2 font-medium">Categoria</th>
                    <th className="px-4 py-2 font-medium text-right">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.slice(0, 10).map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-700">{t.project}</td>
                      <td className="px-4 py-2 text-slate-600 truncate max-w-[100px]">{t.category}</td>
                      <td className="px-4 py-2 text-right text-slate-900">{formatCurrency(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Visualization */}
      {!isAllMonths && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 overflow-x-auto mt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
            <h3 className="text-lg font-bold text-slate-800">Timeline de Ações</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(PROJECT_COLORS).map(([proj, color]) => (
                <div key={proj} className="flex items-center space-x-1.5">
                  <div className={`w-3 h-3 rounded-full ${color}`}></div>
                  <span className="text-xs font-medium text-slate-600">{proj}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="min-w-[1200px] py-12 px-28">
            <div className="flex items-center justify-between relative">
              {/* Main horizontal line */}
              <div className="absolute left-0 right-0 top-1/2 h-2 bg-slate-200 -z-10 rounded-full"></div>
              
              {days.map((day, index) => {
                const dateStr = `${selectedMonthId}-${day.toString().padStart(2, '0')}`;
                const dayEvents = currentMonthEvents.filter(e => e.date === dateStr);
                const hasEvents = dayEvents.length > 0;
                
                // Alternate up and down for nodes with events
                const isUp = index % 2 === 0;
                
                // Color palette for nodes based on project
                const nodeColor = hasEvents ? (PROJECT_COLORS[dayEvents[0].project] || 'bg-slate-800') : 'bg-slate-300';
                
                return (
                  <div key={day} className="flex flex-col items-center relative group w-8">
                    {/* The Node */}
                    <div className={`w-6 h-6 rounded-full border-4 border-white shadow-sm z-10 ${nodeColor}`}></div>
                    
                    {hasEvents && (
                      <>
                        {/* Connecting Line */}
                        <div className={`absolute w-0.5 ${nodeColor} opacity-50`} 
                             style={{ 
                               height: '60px', 
                               top: isUp ? '-60px' : '24px',
                               left: '50%',
                               transform: 'translateX(-50%)'
                             }}>
                        </div>
                        
                        {/* Triangle Pointer */}
                        <div className={`absolute w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent ${isUp ? 'border-b-[8px] border-b-' + nodeColor.replace('bg-', '') : 'border-t-[8px] border-t-' + nodeColor.replace('bg-', '')}`}
                             style={{
                               top: isUp ? '-10px' : '26px',
                               left: '50%',
                               transform: 'translateX(-50%)',
                               borderBottomColor: isUp ? nodeColor.replace('bg-', '') : 'transparent',
                               borderTopColor: !isUp ? nodeColor.replace('bg-', '') : 'transparent',
                             }}>
                        </div>

                        {/* Content Box */}
                        <div className={`absolute w-48 ${isUp ? 'bottom-[80px]' : 'top-[80px]'} left-1/2 -translate-x-1/2`}>
                          <div className={`text-xl font-bold mb-2 text-center ${nodeColor.replace('bg-', 'text-')}`}>
                            {day.toString().padStart(2, '0')}
                          </div>
                          <div className="bg-white p-3 rounded-xl shadow-md border border-slate-100 text-sm">
                            {dayEvents.map((e, i) => (
                              <div key={e.id} className={`${i > 0 ? 'mt-2 pt-2 border-t border-slate-100' : ''}`}>
                                {e.imageUrl && (
                                  <div className="w-full h-20 mb-2 rounded-lg overflow-hidden bg-slate-100">
                                    <img src={e.imageUrl} alt={e.title || e.project} className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div className="flex items-center space-x-1.5">
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PROJECT_COLORS[e.project] || 'bg-slate-800'}`}></div>
                                  <div className="font-bold text-slate-800 truncate">{e.title || e.project}</div>
                                </div>
                                <div className="text-xs text-slate-500 mt-1 line-clamp-2">{e.action}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
