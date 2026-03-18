import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, ArrowLeft, BarChart3, Users, Megaphone, Filter } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, FunnelChart, Funnel, LabelList, Cell
} from 'recharts';
import { useInternoDashboard } from '../hooks/useInternoDashboard';
import { DateRangePicker, DateRange } from '../components/DateRangePicker';

interface Props {
  onBack: () => void;
}

// --- Mock Data Fallbacks ---
const mockStatusData = [
  { name: 'Descartado', value: 800 },
  { name: 'Em Atendimento', value: 400 },
  { name: 'Agendamento', value: 200 },
  { name: 'Visita Realizada', value: 100 },
  { name: 'Venda Realizada', value: 50 },
];

const mockFunnelData = [
  { name: '00. Total de Leads', value: 1547, fill: '#3b82f6' },
  { name: '06. Em Atendimento I.A.', value: 71, fill: '#f59e0b' },
  { name: '07. Fila do Corretor', value: 196, fill: '#10b981' },
  { name: '08. Em Atendimento', value: 1179, fill: '#8b5cf6' },
  { name: '09. Agendamento', value: 20, fill: '#06b6d4' },
  { name: '10. Visita Realizada', value: 47, fill: '#eab308' },
  { name: '12. Venda Realizada', value: 28, fill: '#ec4899' },
];

const mockLineData = [
  { date: '01/12', verter: 10, casaDaMata: 5, natus: 2, insigna: 8 },
  { date: '05/12', verter: 12, casaDaMata: 6, natus: 3, insigna: 9 },
  { date: '10/12', verter: 15, casaDaMata: 8, natus: 4, insigna: 12 },
  { date: '15/12', verter: 68, casaDaMata: 10, natus: 5, insigna: 15 },
  { date: '20/12', verter: 18, casaDaMata: 12, natus: 6, insigna: 18 },
  { date: '25/12', verter: 14, casaDaMata: 9, natus: 4, insigna: 14 },
  { date: '30/12', verter: 20, casaDaMata: 15, natus: 8, insigna: 22 },
];

const mockOriginData = [
  { name: 'Facebook', value: 750 },
  { name: 'Outros', value: 444 },
  { name: 'Site', value: 304 },
  { name: 'Google', value: 53 },
];

const mockCancelReasons = [
  { reason: 'FP - Mais de 3 tentativas...', count: 220 },
  { reason: 'FP - Não tem interesse', count: 129 },
  { reason: 'DADOS DE CONTATO INCORRETOS', count: 104 },
  { reason: 'NÃO RETORNOU TENTATIVAS...', count: 67 },
  { reason: 'FP - Não se cadastrou...', count: 52 },
];

const mockBrokerLeads = [
  { name: 'FABIO BINOTTI', value: 488 },
  { name: 'LEILIANE TAYUMI', value: 449 },
  { name: 'Antonio Escada', value: 141 },
  { name: 'Nona', value: 92 },
  { name: 'Marco Almeida', value: 58 },
];

const mockBrokerTime = [
  { name: 'Jose Varandas', time: 12 },
  { name: 'Cleide Rodrigues', time: 9 },
  { name: 'Nona', time: 8.5 },
  { name: 'LEILIANE TAYUMI', time: 7 },
  { name: 'Cristiane Varandas', time: 4.5 },
];

const mockBrokerActions = [
  { name: 'LEILIANE TAYUMI', actions: 2600 },
  { name: 'FABIO BINOTTI', actions: 1800 },
  { name: 'Antonio Escada', actions: 700 },
  { name: 'Paula Brugg', actions: 250 },
];

const mockAdsProjectData = [
  { name: 'Ipanema', meta: 95, google: 100 },
  { name: 'Casa da Mata', meta: 95, google: 95 },
  { name: 'Insigna', meta: 90, google: 30 },
  { name: 'Verter', meta: 95, google: 0 },
  { name: 'Ares', meta: 90, google: 0 },
];

const mockAdsTimeData = [
  { date: '01/12', meta: 10, google: 0 },
  { date: '05/12', meta: 8, google: 0 },
  { date: '10/12', meta: 15, google: 1 },
  { date: '15/12', meta: 12, google: 0 },
  { date: '20/12', meta: 20, google: 0 },
  { date: '25/12', meta: 18, google: 0 },
  { date: '30/12', meta: 25, google: 2 },
];

// --- Components ---

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#2a2d3d] border border-slate-700 p-3 rounded-lg shadow-xl">
        <p className="text-slate-200 font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// --- Helper to generate competence options ---
const generateCompetenceOptions = () => {
  const options = [{ label: 'Atual (Tempo Real)', value: 'Atual' }];
  const date = new Date();
  date.setDate(1); // Set to 1st of month
  for (let i = 0; i < 12; i++) {
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    options.push({ label: label.charAt(0).toUpperCase() + label.slice(1), value });
    date.setMonth(date.getMonth() - 1);
  }
  return options;
};

const competenceOptions = generateCompetenceOptions();

const CustomFunnel = ({ data, total }: { data: any[], total: number }) => {
  const colors = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#eab308', '#ec4899', '#f43f5e', '#84cc16'];
  
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500">
        Nenhum dado encontrado para os filtros selecionados.
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center">
      {/* Labels on the left */}
      <div className="w-1/2 h-full flex flex-col justify-between py-4 z-10">
        {data.map((item, idx) => {
          const percentage = total > 0 ? ((item.value / total) * 100).toFixed(2) : '0.00';
          return (
            <div key={idx} className="flex items-center justify-end pr-4 relative h-full">
              <span className="text-xs font-medium text-slate-300 whitespace-nowrap z-10 bg-[#242731] px-1">
                {item.name} {item.value} ({percentage}%)
              </span>
              {/* Connecting line */}
              <div className="absolute right-0 top-1/2 w-8 h-[1px] bg-slate-600 -mr-4"></div>
            </div>
          );
        })}
      </div>
      
      {/* Funnel SVG on the right */}
      <div className="w-1/2 h-full py-4">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          {data.map((item, idx) => {
            const n = data.length;
            const yTop = (idx / n) * 100;
            const yBottom = ((idx + 1) / n) * 100;
            
            // Width goes from 100% at top to 10% at bottom
            const wTop = 100 - (idx / n) * 90;
            const wBottom = 100 - ((idx + 1) / n) * 90;
            
            const xTopLeft = (100 - wTop) / 2;
            const xTopRight = 100 - xTopLeft;
            const xBottomLeft = (100 - wBottom) / 2;
            const xBottomRight = 100 - xBottomLeft;
            
            return (
              <polygon
                key={idx}
                points={`${xTopLeft},${yTop} ${xTopRight},${yTop} ${xBottomRight},${yBottom} ${xBottomLeft},${yBottom}`}
                fill={colors[idx % colors.length]}
                stroke="#242731"
                strokeWidth="0.5"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default function InternoDashboard({ onBack }: Props) {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'gerais' | 'corretores' | 'ads'>('gerais');
  const [filters, setFilters] = useState({ 
    period: 'Todo o período', 
    project: 'Todos', 
    broker: 'Todos',
    competence: 'Atual',
    startDate: undefined,
    endDate: undefined
  });

  const { 
    loading, error, statusData, funnelData, stackedStatusData, availableMonths, brokerTimeData, brokerActionsData, 
    originData, cancelReasons, brokerLeads, lineData, lineChartKeys, totalLeads, hottestStatusData 
  } = useInternoDashboard(filters);

  const displayStatusData = statusData;
  const displayFunnelData = funnelData;
  const displayStackedStatusData = stackedStatusData;
  const displayAvailableMonths = availableMonths;
  const displayBrokerTime = brokerTimeData;
  const displayBrokerActions = brokerActionsData;
  const displayOriginData = originData;
  const displayCancelReasons = cancelReasons;
  const displayBrokerLeads = brokerLeads;
  const displayLineData = lineData;
  const displayLineChartKeys = lineChartKeys;
  
  const displayTotalLeads = totalLeads.toLocaleString('pt-BR');
  const displayVisitaCount = hottestStatusData.visita;
  const displayAgendamentoCount = hottestStatusData.agendamento;

  return (
    <div className="min-h-screen bg-[#1a1c23] flex flex-col animate-in fade-in duration-500 font-sans text-slate-200">
      {/* Header */}
      <header className="bg-[#242731] border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Voltar para seleção"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-white">Dashboard Interno Mkt</h1>
        </div>
        
        <div className="flex bg-[#1a1c23] p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('gerais')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${activeTab === 'gerais' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <BarChart3 size={16} />
            <span>Resultados Gerais</span>
          </button>
          <button
            onClick={() => setActiveTab('corretores')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${activeTab === 'corretores' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Users size={16} />
            <span>Corretores</span>
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${activeTab === 'ads' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Megaphone size={16} />
            <span>Mídia Paga</span>
          </button>
        </div>

        <button
          onClick={signOut}
          className="flex items-center space-x-2 text-slate-400 hover:text-rose-500 transition-colors px-3 py-2 rounded-xl hover:bg-rose-500/10"
        >
          <LogOut size={18} />
          <span className="font-medium text-sm">Sair</span>
        </button>
      </header>

      {/* Filters Bar */}
      <div className="bg-[#242731] border-b border-slate-800 px-6 py-3 flex items-center space-x-4 flex-wrap gap-y-2 relative z-40">
        <DateRangePicker 
          value={{ period: filters.period, startDate: filters.startDate, endDate: filters.endDate }}
          onChange={(range) => setFilters({ 
            ...filters, 
            period: range.period, 
            startDate: range.startDate, 
            endDate: range.endDate 
          })}
        />

        <div className="flex items-center space-x-2 text-slate-400 bg-[#1a1c23] px-3 py-1.5 rounded-lg border border-slate-700">
          <select 
            className="bg-transparent border-none outline-none text-sm text-slate-200"
            value={filters.competence}
            onChange={(e) => setFilters({ ...filters, competence: e.target.value })}
          >
            {competenceOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2 text-slate-400 bg-[#1a1c23] px-3 py-1.5 rounded-lg border border-slate-700">
          <select 
            className="bg-transparent border-none outline-none text-sm text-slate-200"
            value={filters.project}
            onChange={(e) => setFilters({ ...filters, project: e.target.value })}
          >
            <option value="Todos">Todos os Empreendimentos</option>
            <option value="Ipanema">Ipanema</option>
            <option value="Casa da Mata">Casa da Mata</option>
            <option value="Insigna">Insigna</option>
            <option value="Verter">Verter</option>
            <option value="Ares">Ares</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2 text-slate-400 bg-[#1a1c23] px-3 py-1.5 rounded-lg border border-slate-700">
          <select 
            className="bg-transparent border-none outline-none text-sm text-slate-200"
            value={filters.broker}
            onChange={(e) => setFilters({ ...filters, broker: e.target.value })}
          >
            <option value="Todos">Todos os Corretores</option>
            <option value="FABIO BINOTTI">Fabio Binotti</option>
            <option value="LEILIANE TAYUMI">Leiliane Tayumi</option>
            <option value="Antonio Escada">Antonio Escada</option>
          </select>
        </div>
      </div>

      <main className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'gerais' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Top Row */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="flex flex-col space-y-4">
                <div className="bg-[#242731] p-6 rounded-xl border border-slate-800 text-center flex flex-col justify-center items-center">
                  <p className="text-slate-400 text-sm font-medium mb-1 uppercase">Leads Totais</p>
                  <p className="text-4xl font-bold text-white">{displayTotalLeads}</p>
                </div>
                
                <div className="text-center mt-4 mb-2">
                  <p className="text-slate-400 text-sm font-medium uppercase">Status Mais Quente</p>
                </div>

                <div className="bg-[#242731] p-6 rounded-xl border border-slate-800 text-center flex flex-col justify-center items-center">
                  <p className="text-slate-400 text-sm font-medium mb-1">Agendamento</p>
                  <p className="text-4xl font-bold text-white">{displayAgendamentoCount}</p>
                </div>

                <div className="bg-[#242731] p-6 rounded-xl border border-slate-800 text-center flex flex-col justify-center items-center">
                  <p className="text-slate-400 text-sm font-medium mb-1">Visitas</p>
                  <p className="text-4xl font-bold text-white">{displayVisitaCount}</p>
                </div>
              </div>
              
              <div className="lg:col-span-3 bg-[#242731] p-6 rounded-xl border border-slate-800">
                <h3 className="text-sm font-medium text-slate-400 mb-4">Status</h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={displayStatusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Funnel Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#242731] p-6 rounded-xl border border-slate-800">
                <h3 className="text-sm font-medium text-slate-400 mb-4">Funil Status Atual</h3>
                <div className="h-80">
                  <CustomFunnel data={displayFunnelData} total={totalLeads || 1551} />
                </div>
              </div>
              <div className="bg-[#242731] p-6 rounded-xl border border-slate-800">
                <h3 className="text-sm font-medium text-slate-400 mb-4">Evolução de Status</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={displayStackedStatusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="status" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} verticalAlign="top" height={36} />
                      {displayAvailableMonths.map((month, idx) => (
                        <Bar key={month} dataKey={month} stackId="a" fill={['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'][idx % 5]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Line Chart Row */}
            <div className="bg-[#242731] p-6 rounded-xl border border-slate-800">
              <h3 className="text-sm font-medium text-slate-400 mb-4">Evolução de Leads por Empreendimento</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={displayLineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                      {displayLineChartKeys.map((key, idx) => (
                        <Line 
                          key={key}
                          type="monotone" 
                          dataKey={key} 
                          stroke={['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#ef4444', '#14b8a6', '#f97316'][idx % 8]} 
                          strokeWidth={2} 
                          dot={false} 
                        />
                      ))}
                    </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#242731] p-6 rounded-xl border border-slate-800">
                <h3 className="text-sm font-medium text-slate-400 mb-4">Origem</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={displayOriginData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="bg-[#242731] p-6 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
                <h3 className="text-sm font-medium text-slate-400 mb-4">Motivo Cancelamento</h3>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 uppercase bg-[#1a1c23]">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Motivo</th>
                        <th className="px-4 py-3 rounded-tr-lg text-right">Record Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayCancelReasons.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-800/50 hover:bg-[#1a1c23]/50">
                          <td className="px-4 py-3 font-medium">{item.reason}</td>
                          <td className="px-4 py-3 text-right text-blue-400">{item.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Brokers Row */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 bg-[#242731] p-6 rounded-xl border border-slate-800">
                <h3 className="text-sm font-medium text-slate-400 mb-4">Leads por Corretor</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={displayBrokerLeads} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={150} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-4 flex flex-col justify-center">
                <div className="bg-[#242731] p-4 rounded-xl border border-slate-800 text-center flex-1 flex flex-col justify-center">
                  <p className="text-slate-400 text-sm font-medium mb-1">Tayumi</p>
                  <p className="text-3xl font-bold text-white">
                    {displayBrokerLeads.find(b => b.name.toUpperCase().includes('TAYUMI'))?.value || 0}
                  </p>
                </div>
                <div className="bg-[#242731] p-4 rounded-xl border border-slate-800 text-center flex-1 flex flex-col justify-center">
                  <p className="text-slate-400 text-sm font-medium mb-1">Fabio Binotti</p>
                  <p className="text-3xl font-bold text-white">
                    {displayBrokerLeads.find(b => b.name.toUpperCase().includes('FABIO BINOTTI'))?.value || 0}
                  </p>
                </div>
                <div className="bg-[#242731] p-4 rounded-xl border border-slate-800 text-center flex-1 flex flex-col justify-center">
                  <p className="text-slate-400 text-sm font-medium mb-1">Stand Virtual</p>
                  <p className="text-3xl font-bold text-white">
                    {displayBrokerLeads.find(b => b.name.toUpperCase().includes('STAND VIRTUAL'))?.value || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'corretores' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <div className="bg-[#242731] p-6 rounded-xl border border-slate-800">
              <h3 className="text-sm font-medium text-slate-400 mb-4">Tempo Médio de Recepção do Lead (Horas)</h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayBrokerTime} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={120} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="time" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#242731] p-6 rounded-xl border border-slate-800">
              <h3 className="text-sm font-medium text-slate-400 mb-4">Ações no CV</h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayBrokerActions} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={120} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="actions" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ads' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Meta Ads */}
              <div className="bg-[#242731] p-6 rounded-xl border border-slate-800">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </div>
                  <h2 className="text-xl font-bold text-white">Meta Ads</h2>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-slate-400 text-xs font-medium mb-1">Leads</p>
                    <p className="text-2xl font-bold text-white">638</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs font-medium mb-1">CPL</p>
                    <p className="text-2xl font-bold text-white">R$ 120,68</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs font-medium mb-1">Total Gasto</p>
                    <p className="text-2xl font-bold text-white">R$ 76.992,33</p>
                  </div>
                </div>
              </div>

              {/* Google Ads */}
              <div className="bg-[#242731] p-6 rounded-xl border border-slate-800">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.827-.074-1.624-.213-2.395H12v4.527h6.585a5.636 5.636 0 0 1-2.445 3.696v3.07h3.957c2.315-2.131 3.648-5.274 3.648-8.898z"/><path fill="#34A853" d="M12 24c3.305 0 6.075-1.095 8.102-2.962l-3.957-3.07c-1.095.734-2.495 1.168-4.145 1.168-3.188 0-5.885-2.152-6.845-5.044H1.055v3.174C3.082 21.31 7.205 24 12 24z"/><path fill="#FBBC05" d="M5.155 14.092A7.18 7.18 0 0 1 4.79 12c0-.734.13-1.446.365-2.092V6.734H1.055A11.96 11.96 0 0 0 0 12c0 1.936.465 3.764 1.285 5.408l3.87-3.316z"/><path fill="#EA4335" d="M12 4.832c1.796 0 3.41.618 4.678 1.83l3.51-3.51C18.07 1.205 15.305 0 12 0 7.205 0 3.082 2.69 1.055 6.734l3.87 3.316c.96-2.892 3.657-5.044 6.845-5.044z"/></svg>
                  </div>
                  <h2 className="text-xl font-bold text-white">Google Ads</h2>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-slate-400 text-xs font-medium mb-1">Conversions</p>
                    <p className="text-2xl font-bold text-white">194</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs font-medium mb-1">CPL</p>
                    <p className="text-2xl font-bold text-white">R$ 129,91</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs font-medium mb-1">Cost (Spend)</p>
                    <p className="text-2xl font-bold text-white">R$ 25.202,73</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stacked Bar Chart */}
            <div className="bg-[#242731] p-6 rounded-xl border border-slate-800">
              <h3 className="text-sm font-medium text-slate-400 mb-4">Leads por Empreendimento (Meta vs Google)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockAdsProjectData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                    <Bar dataKey="meta" name="Meta Ads" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="google" name="Google Ads" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Line Chart */}
            <div className="bg-[#242731] p-6 rounded-xl border border-slate-800">
              <h3 className="text-sm font-medium text-slate-400 mb-4">Evolução de Leads (Meta vs Google)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockAdsTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                    <Line type="monotone" dataKey="meta" name="Meta Ads" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="google" name="Google Ads" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded-xl flex items-start space-x-3">
              <Megaphone className="text-blue-400 mt-0.5" size={20} />
              <div>
                <h4 className="text-blue-400 font-medium">Integração com Reportei</h4>
                <p className="text-blue-300/70 text-sm mt-1">
                  Estes dados são demonstrativos. A integração com a API do Reportei será implementada para trazer os dados reais de Meta Ads e Google Ads automaticamente.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
