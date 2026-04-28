import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, ArrowRight } from 'lucide-react';

interface Props {
  onSelect: (dashboard: 'comercial' | 'interno' | 'gdash') => void;
}

export default function DashboardSelection({ onSelect }: Props) {
  const { userRole } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Selecione o Dashboard</h1>
          <p className="text-slate-500 text-lg">Escolha qual área você deseja acessar</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {/* Dashboard Comercial / Mkt */}
          <button
            onClick={() => onSelect('comercial')}
            className="group relative bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
              <ArrowRight className="text-emerald-500" size={24} />
            </div>
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <LayoutDashboard className="text-emerald-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Dashboard Comercial / Mkt</h2>
            <p className="text-slate-500">
              Acompanhamento de vendas, VGV, leads, visitas e despesas de marketing dos empreendimentos.
            </p>
          </button>

          {/* Dashboard Interno Mkt */}
          <button
            onClick={() => onSelect('interno')}
            className="group relative bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
              <ArrowRight className="text-indigo-500" size={24} />
            </div>
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Users className="text-indigo-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Interno Mkt</h2>
            <p className="text-slate-500">
              Acompanhamento de métricas internas, equipe e processos do departamento de marketing.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
