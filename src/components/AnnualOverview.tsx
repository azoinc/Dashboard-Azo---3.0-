import React, { useState } from 'react';
import { formatCurrency } from '../utils';
import { Target, TrendingUp, Building2, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { ProjectData, spProjects, rjProjects } from '../data/commercialProjects';

const calculateTotal = (projects: ProjectData[]): ProjectData => {
  return projects.reduce((acc, curr) => ({
    name: 'Total',
    target: { unid: acc.target.unid + curr.target.unid, vgv: acc.target.vgv + curr.target.vgv },
    q1: { unid: acc.q1.unid + curr.q1.unid, vgv: acc.q1.vgv + curr.q1.vgv },
    q2: { unid: acc.q2.unid + curr.q2.unid, vgv: acc.q2.vgv + curr.q2.vgv },
    q3: { unid: acc.q3.unid + curr.q3.unid, vgv: acc.q3.vgv + curr.q3.vgv },
    q4: { unid: acc.q4.unid + curr.q4.unid, vgv: acc.q4.vgv + curr.q4.vgv },
    total: { unid: acc.total.unid + curr.total.unid, vgv: acc.total.vgv + curr.total.vgv },
    vso: 0 // Calculated later
  }), {
    name: 'Total',
    target: { unid: 0, vgv: 0 },
    q1: { unid: 0, vgv: 0 },
    q2: { unid: 0, vgv: 0 },
    q3: { unid: 0, vgv: 0 },
    q4: { unid: 0, vgv: 0 },
    total: { unid: 0, vgv: 0 },
    vso: 0
  });
};

const totalSP = calculateTotal(spProjects);
totalSP.name = 'São Paulo';
totalSP.vso = Math.round((totalSP.total.unid / totalSP.target.unid) * 100);

const totalRJ = calculateTotal(rjProjects);
totalRJ.name = 'Rio de Janeiro';
totalRJ.vso = Math.round((totalRJ.total.unid / totalRJ.target.unid) * 100);

const totalGeral = calculateTotal([totalSP, totalRJ]);
totalGeral.name = 'Total Geral';
totalGeral.vso = Math.round((totalGeral.total.unid / totalGeral.target.unid) * 100);

const formatVGV = (value: number) => {
  if (value === 0) return '-';
  return formatCurrency(value).replace('R$', '').trim();
};

export const AnnualOverview = () => {
  const [expandedSP, setExpandedSP] = useState(true);
  const [expandedRJ, setExpandedRJ] = useState(true);

  const renderRow = (project: ProjectData, isTotal = false, isGrandTotal = false) => {
    const baseClasses = isGrandTotal 
      ? 'bg-slate-800 text-white font-bold' 
      : isTotal 
        ? 'bg-slate-100 font-bold text-slate-800' 
        : 'hover:bg-slate-50 text-slate-600 bg-white';

    return (
      <tr key={project.name} className={`border-b border-slate-200 transition-colors ${baseClasses}`}>
        <td className={`px-4 py-3 whitespace-nowrap sticky left-0 z-10 ${isGrandTotal ? 'bg-slate-800' : isTotal ? 'bg-slate-100' : 'bg-white'} border-r border-slate-200`}>
          <div className="flex items-center space-x-2">
            {!isTotal && !isGrandTotal && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>}
            <span>{project.name}</span>
          </div>
        </td>
        
        {/* Meta */}
        <td className="px-4 py-3 text-center bg-slate-50/50">{project.target.unid}</td>
        <td className="px-4 py-3 text-right border-r border-slate-200 bg-slate-50/50">{formatVGV(project.target.vgv)}</td>
        
        {/* Q1 */}
        <td className="px-4 py-3 text-center">{project.q1.unid || '-'}</td>
        <td className="px-4 py-3 text-right border-r border-slate-200">{formatVGV(project.q1.vgv)}</td>
        
        {/* Q2 */}
        <td className="px-4 py-3 text-center">{project.q2.unid || '-'}</td>
        <td className="px-4 py-3 text-right border-r border-slate-200">{formatVGV(project.q2.vgv)}</td>
        
        {/* Q3 */}
        <td className="px-4 py-3 text-center">{project.q3.unid || '-'}</td>
        <td className="px-4 py-3 text-right border-r border-slate-200">{formatVGV(project.q3.vgv)}</td>
        
        {/* Q4 */}
        <td className="px-4 py-3 text-center">{project.q4.unid || '-'}</td>
        <td className="px-4 py-3 text-right border-r border-slate-200">{formatVGV(project.q4.vgv)}</td>
        
        {/* Total */}
        <td className="px-4 py-3 text-center font-semibold bg-indigo-50/30">{project.total.unid}</td>
        <td className="px-4 py-3 text-right font-semibold border-r border-slate-200 bg-indigo-50/30">{formatVGV(project.total.vgv)}</td>
        
        {/* VSO */}
        <td className="px-4 py-3 text-center">
          <div className="flex items-center justify-center space-x-2">
            <span className={`w-10 text-right font-medium ${project.vso >= 100 ? 'text-emerald-600' : project.vso >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
              {project.vso}%
            </span>
            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
              <div 
                className={`h-full rounded-full ${project.vso >= 100 ? 'bg-emerald-500' : project.vso >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(project.vso, 100)}%` }}
              />
            </div>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-start space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Target size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Meta Anual (VGV)</p>
            <h4 className="text-[0.9rem] font-bold text-slate-800 mt-1">{formatCurrency(totalGeral.target.vgv)}</h4>
            <p className="text-xs text-slate-400 mt-1">{totalGeral.target.unid} unidades no total</p>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-start space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Realizado (VGV)</p>
            <h4 className="text-[0.9rem] font-bold text-slate-800 mt-1">{formatCurrency(totalGeral.total.vgv)}</h4>
            <p className="text-xs text-emerald-600 font-medium mt-1">
              {((totalGeral.total.vgv / totalGeral.target.vgv) * 100).toFixed(1)}% da meta de VGV
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-start space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Unidades Vendidas</p>
            <h4 className="text-[0.9rem] font-bold text-slate-800 mt-1">
              {totalGeral.total.unid} <span className="text-lg text-slate-400 font-medium">/ {totalGeral.target.unid}</span>
            </h4>
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full" 
                style={{ width: `${(totalGeral.total.unid / totalGeral.target.unid) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-start space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <BarChart3 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">VSO Geral</p>
            <h4 className="text-[0.9rem] font-bold text-slate-800 mt-1">{totalGeral.vso}%</h4>
            <p className="text-xs text-slate-400 mt-1">Velocidade de Vendas sobre Oferta</p>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Target className="text-indigo-500" size={20} />
              Meta Equipe de Vendas - Projetos Ativos
            </h3>
            <p className="text-sm text-slate-500 mt-1">Visão anual distribuída por trimestres e praças</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-semibold">
              <tr>
                <th rowSpan={2} className="px-4 py-3 sticky left-0 z-20 bg-slate-50 border-r border-slate-200 border-b">Empreendimento</th>
                <th colSpan={2} className="px-4 py-2 text-center border-r border-slate-200 border-b bg-slate-100/50">Meta</th>
                <th colSpan={2} className="px-4 py-2 text-center border-r border-slate-200 border-b">1º Tri</th>
                <th colSpan={2} className="px-4 py-2 text-center border-r border-slate-200 border-b">2º Tri</th>
                <th colSpan={2} className="px-4 py-2 text-center border-r border-slate-200 border-b">3º Tri</th>
                <th colSpan={2} className="px-4 py-2 text-center border-r border-slate-200 border-b">4º Tri</th>
                <th colSpan={2} className="px-4 py-2 text-center border-r border-slate-200 border-b bg-indigo-50/50 text-indigo-800">Total</th>
                <th rowSpan={2} className="px-4 py-3 text-center border-b border-slate-200">VSO</th>
              </tr>
              <tr>
                <th className="px-4 py-2 text-center border-b border-slate-200 bg-slate-100/50">Unid</th>
                <th className="px-4 py-2 text-right border-r border-slate-200 border-b bg-slate-100/50">VGV (vp)</th>
                <th className="px-4 py-2 text-center border-b border-slate-200">Unid</th>
                <th className="px-4 py-2 text-right border-r border-slate-200 border-b">VGV (vp)</th>
                <th className="px-4 py-2 text-center border-b border-slate-200">Unid</th>
                <th className="px-4 py-2 text-right border-r border-slate-200 border-b">VGV (vp)</th>
                <th className="px-4 py-2 text-center border-b border-slate-200">Unid</th>
                <th className="px-4 py-2 text-right border-r border-slate-200 border-b">VGV (vp)</th>
                <th className="px-4 py-2 text-center border-b border-slate-200">Unid</th>
                <th className="px-4 py-2 text-right border-r border-slate-200 border-b">VGV (vp)</th>
                <th className="px-4 py-2 text-center border-b border-slate-200 bg-indigo-50/50 text-indigo-800">Unid</th>
                <th className="px-4 py-2 text-right border-r border-slate-200 border-b bg-indigo-50/50 text-indigo-800">VGV (vp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* SP Section */}
              <tr 
                className="bg-slate-100/80 cursor-pointer hover:bg-slate-200/80 transition-colors"
                onClick={() => setExpandedSP(!expandedSP)}
              >
                <td colSpan={14} className="px-4 py-3 font-bold text-slate-800 sticky left-0">
                  <div className="flex items-center space-x-2">
                    {expandedSP ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronRight size={18} className="text-slate-500" />}
                    <span>São Paulo</span>
                    <span className="text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      {spProjects.length} projetos
                    </span>
                  </div>
                </td>
              </tr>
              {expandedSP && spProjects.map(p => renderRow(p))}
              {expandedSP && renderRow(totalSP, true)}
              
              {/* RJ Section */}
              <tr 
                className="bg-slate-100/80 cursor-pointer hover:bg-slate-200/80 transition-colors"
                onClick={() => setExpandedRJ(!expandedRJ)}
              >
                <td colSpan={14} className="px-4 py-3 font-bold text-slate-800 sticky left-0 border-t border-slate-200">
                  <div className="flex items-center space-x-2">
                    {expandedRJ ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronRight size={18} className="text-slate-500" />}
                    <span>Rio de Janeiro</span>
                    <span className="text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      {rjProjects.length} projetos
                    </span>
                  </div>
                </td>
              </tr>
              {expandedRJ && rjProjects.map(p => renderRow(p))}
              {expandedRJ && renderRow(totalRJ, true)}
              
              {/* Grand Total */}
              {renderRow(totalGeral, false, true)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

