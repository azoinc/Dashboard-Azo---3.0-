import React, { useState } from 'react';
import { LayoutDashboard, Receipt, Menu, X, Building2, MapPin, UserCircle, TrendingUp, LogOut, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { useAuth } from '../context/AuthContext';
import { MONTHS } from '../utils';
import { City, Project, PROJECTS_BY_CITY } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'entry' | 'commercial' | 'institucional' | 'timeline' | 'admin';
  setActiveTab: (tab: 'dashboard' | 'entry' | 'commercial' | 'institucional' | 'timeline' | 'admin') => void;
  onBackToSelection?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onBackToSelection }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { 
    data, selectedMonthId, setSelectedMonthId, currentMonthData,
    selectedCity, setSelectedCity, selectedProject, setSelectedProject
  } = useExpense();
  const { userRole, user, signOut } = useAuth();

  const availableProjects = selectedCity === 'ALL' 
    ? [...PROJECTS_BY_CITY['Rio de Janeiro'], ...PROJECTS_BY_CITY['Campinas']]
    : PROJECTS_BY_CITY[selectedCity];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar / Top Nav */}
      <nav className="bg-[#61072E] text-white w-full md:w-64 flex-shrink-0 md:h-screen sticky top-0 z-50 flex flex-col shadow-xl">
        <div className="p-5 flex items-center justify-between md:justify-center border-b border-[#4a0523]">
          <div className="flex items-center space-x-2">
            {onBackToSelection && (
              <button 
                onClick={onBackToSelection}
                className="p-1.5 mr-2 bg-[#4a0523] hover:bg-rose-900/50 text-white/70 hover:text-white rounded-lg transition-colors"
                title="Voltar para seleção de dashboard"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-[#61072E]">A</div>
            <h1 className="text-xl font-bold tracking-tight text-white">Dashboard - Marketing Azo</h1>
          </div>
          <button className="md:hidden p-2 text-white/70 hover:text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto ${isMobileMenuOpen ? 'block' : 'hidden'} md:flex md:flex-col`}>
          <div className="p-4 border-b border-[#4a0523]">
            <div className="flex items-center space-x-2 mb-2">
              <UserCircle size={16} className="text-white/70" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">{user?.email}</span>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">{userRole === 'MASTER' ? '' : userRole}</span>
              </div>
            </div>
            <button
              onClick={signOut}
              className="mt-3 w-full flex items-center justify-center space-x-2 px-3 py-2 bg-[#4a0523] hover:bg-rose-900/50 text-white/70 hover:text-rose-400 rounded-lg transition-colors text-sm"
            >
              <LogOut size={16} />
              <span>Sair</span>
            </button>
          </div>

          <div className="p-4 space-y-2 flex-1">
            <button
              onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-emerald-500 text-[#61072E] shadow-md shadow-emerald-500/20' : 'hover:bg-[#4a0523] text-white/70 hover:text-white'}`}
            >
              <LayoutDashboard size={20} />
              <span className="font-medium">Dashboard</span>
            </button>
            {userRole !== 'DIRETORIA' && (
              <>
                <button
                  onClick={() => { setActiveTab('entry'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'entry' ? 'bg-emerald-500 text-[#61072E] shadow-md shadow-emerald-500/20' : 'hover:bg-[#4a0523] text-white/70 hover:text-white'}`}
                >
                  <Receipt size={20} />
                  <span className="font-medium">Lançamentos</span>
                </button>
                <button
                  onClick={() => { setActiveTab('commercial'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'commercial' ? 'bg-emerald-500 text-[#61072E] shadow-md shadow-emerald-500/20' : 'hover:bg-[#4a0523] text-white/70 hover:text-white'}`}
                >
                  <TrendingUp size={20} />
                  <span className="font-medium">Comercial</span>
                </button>
                <button
                  onClick={() => { setActiveTab('institucional'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'institucional' ? 'bg-emerald-500 text-[#61072E] shadow-md shadow-emerald-500/20' : 'hover:bg-[#4a0523] text-white/70 hover:text-white'}`}
                >
                  <Building2 size={20} />
                  <span className="font-medium">Institucional</span>
                </button>
                <button
                  onClick={() => { setActiveTab('timeline'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'timeline' ? 'bg-emerald-500 text-[#61072E] shadow-md shadow-emerald-500/20' : 'hover:bg-[#4a0523] text-white/70 hover:text-white'}`}
                >
                  <TrendingUp size={20} />
                  <span className="font-medium">Timeline</span>
                </button>
              </>
            )}
            {userRole === 'MASTER' && (
              <button
                onClick={() => { setActiveTab('admin'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'admin' ? 'bg-emerald-500 text-[#61072E] shadow-md shadow-emerald-500/20' : 'hover:bg-[#4a0523] text-white/70 hover:text-white'}`}
              >
                <ShieldAlert size={20} />
                <span className="font-medium">Admin</span>
              </button>
            )}
          </div>

          <div className="p-5 border-t border-[#4a0523] bg-[#4a0523]/50">
            <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Filtros</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-white/70 mb-1 block">Ano</label>
                  <select
                    value={currentMonthData?.year || ''}
                    onChange={(e) => {
                      const year = parseInt(e.target.value);
                      setSelectedMonthId(`${year}-ALL`);
                    }}
                    className="w-full bg-[#4a0523] border border-[#7a093a] text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  >
                    {Array.from(new Set(data.map(m => m.year))).sort((a, b) => Number(b) - Number(a)).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/70 mb-1 block">Mês</label>
                  <select
                    value={selectedMonthId}
                    onChange={(e) => setSelectedMonthId(e.target.value)}
                    className="w-full bg-[#4a0523] border border-[#7a093a] text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  >
                    <option value={`${currentMonthData?.year || new Date().getFullYear()}-ALL`}>Todos os meses</option>
                    {data.filter(m => m.year === (currentMonthData?.year || new Date().getFullYear())).sort((a, b) => b.month - a.month).map(m => (
                      <option key={m.id} value={m.id}>{MONTHS[m.month - 1]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-white/70 mb-1 flex items-center"><MapPin size={12} className="mr-1"/> Cidade</label>
                <select
                  value={selectedCity}
                  onChange={(e) => {
                    setSelectedCity(e.target.value as City | 'ALL');
                    setSelectedProject('ALL');
                  }}
                  disabled={userRole !== 'MASTER' && userRole !== 'DIRETORIA' && userRole !== 'ADMINISTRATIVO'}
                  className="w-full bg-[#4a0523] border border-[#7a093a] text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm disabled:opacity-50"
                >
                  <option value="ALL">Todas as Cidades</option>
                  <option value="Rio de Janeiro">Rio de Janeiro</option>
                  <option value="Campinas">Campinas</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-white/70 mb-1 flex items-center"><Building2 size={12} className="mr-1"/> Empreendimento</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value as Project | 'ALL')}
                  className="w-full bg-[#4a0523] border border-[#7a093a] text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                >
                  <option value="ALL">Todos os Empreendimentos</option>
                  {availableProjects.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* Feito por Bruno "Tiffs" Mossato */}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
