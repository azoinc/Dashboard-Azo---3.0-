import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { ALL_PROJECTS, Project } from '../types';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({ isOpen, onClose }) => {
  const { currentMonthData, updateBudget } = useExpense();
  
  // Local state to hold the form data before saving
  const [localBudgets, setLocalBudgets] = useState<Record<string, { 
    publicidade: string, 
    stand: string, 
    institucional: string,
    produtos: string,
    vgv: string,
    percentMkt: string,
    percentManutStand: string,
    percentProduto: string,
    estoqueUnid: string,
    metaVendas: string
  }>>({});

  useEffect(() => {
    if (isOpen && currentMonthData) {
      const initialBudgets: Record<string, any> = {};
      ALL_PROJECTS.forEach(p => {
        initialBudgets[p] = {
          publicidade: currentMonthData.budgets[p]?.publicidade?.toString() || '',
          stand: currentMonthData.budgets[p]?.stand?.toString() || '',
          institucional: currentMonthData.budgets[p]?.institucional?.toString() || '',
          produtos: currentMonthData.budgets[p]?.produtos?.toString() || '',
          vgv: currentMonthData.budgets[p]?.vgv?.toString() || '',
          percentMkt: currentMonthData.budgets[p]?.percentMkt?.toString() || '',
          percentManutStand: currentMonthData.budgets[p]?.percentManutStand?.toString() || '',
          percentProduto: currentMonthData.budgets[p]?.percentProduto?.toString() || '',
          estoqueUnid: currentMonthData.budgets[p]?.estoqueUnid?.toString() || '',
          metaVendas: currentMonthData.budgets[p]?.metaVendas?.toString() || ''
        };
      });
      setLocalBudgets(initialBudgets);
    }
  }, [isOpen, currentMonthData]);

  if (!isOpen || !currentMonthData) return null;

  const handleSave = () => {
    ALL_PROJECTS.forEach(p => {
      const pub = parseFloat(localBudgets[p].publicidade);
      const stand = parseFloat(localBudgets[p].stand);
      const inst = parseFloat(localBudgets[p].institucional);
      const prod = parseFloat(localBudgets[p].produtos);
      const vgv = parseFloat(localBudgets[p].vgv);
      const pMkt = parseFloat(localBudgets[p].percentMkt);
      const pStand = parseFloat(localBudgets[p].percentManutStand);
      const pProd = parseFloat(localBudgets[p].percentProduto);
      const est = parseFloat(localBudgets[p].estoqueUnid);
      const meta = parseFloat(localBudgets[p].metaVendas);
      
      updateBudget(p, {
        publicidade: isNaN(pub) ? 0 : pub,
        stand: isNaN(stand) ? 0 : stand,
        institucional: isNaN(inst) ? 0 : inst,
        produtos: isNaN(prod) ? 0 : prod,
        vgv: isNaN(vgv) ? 0 : vgv,
        percentMkt: isNaN(pMkt) ? 0 : pMkt,
        percentManutStand: isNaN(pStand) ? 0 : pStand,
        percentProduto: isNaN(pProd) ? 0 : pProd,
        estoqueUnid: isNaN(est) ? 0 : est,
        metaVendas: isNaN(meta) ? 0 : meta
      });
    });
    onClose();
  };

  const handleChange = (project: Project, field: string, value: string) => {
    setLocalBudgets(prev => {
      const current = prev[project];
      const updates: any = { [field]: value };
      
      const vgv = field === 'vgv' ? parseFloat(value) : parseFloat(current.vgv);
      
      if (vgv > 0) {
        if (field === 'publicidade') {
          const pub = parseFloat(value);
          if (!isNaN(pub)) updates.percentMkt = ((pub / vgv) * 100).toFixed(2);
        } else if (field === 'stand') {
          const stand = parseFloat(value);
          if (!isNaN(stand)) updates.percentManutStand = ((stand / vgv) * 100).toFixed(2);
        } else if (field === 'produtos') {
          const prod = parseFloat(value);
          if (!isNaN(prod)) updates.percentProduto = ((prod / vgv) * 100).toFixed(2);
        } else if (field === 'percentMkt') {
          const pMkt = parseFloat(value);
          if (!isNaN(pMkt)) updates.publicidade = ((pMkt / 100) * vgv).toFixed(2);
        } else if (field === 'percentManutStand') {
          const pStand = parseFloat(value);
          if (!isNaN(pStand)) updates.stand = ((pStand / 100) * vgv).toFixed(2);
        } else if (field === 'percentProduto') {
          const pProd = parseFloat(value);
          if (!isNaN(pProd)) updates.produtos = ((pProd / 100) * vgv).toFixed(2);
        } else if (field === 'vgv') {
          // If VGV changes, recalculate percentages based on current budgets
          const pub = parseFloat(current.publicidade);
          if (!isNaN(pub)) updates.percentMkt = ((pub / vgv) * 100).toFixed(2);
          
          const stand = parseFloat(current.stand);
          if (!isNaN(stand)) updates.percentManutStand = ((stand / vgv) * 100).toFixed(2);
          
          const prod = parseFloat(current.produtos);
          if (!isNaN(prod)) updates.percentProduto = ((prod / vgv) * 100).toFixed(2);
        }
      }

      return {
        ...prev,
        [project]: {
          ...current,
          ...updates
        }
      };
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Definir Previsões (Orçamentos)</h2>
            <p className="text-sm text-slate-500 mt-1">Configure os valores previstos para cada empreendimento neste mês.</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {ALL_PROJECTS.map(project => (
              <div key={project} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-3">{project}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Publicidade (R$)</label>
                    <input
                      type="number"
                      value={localBudgets[project]?.publicidade || ''}
                      onChange={(e) => handleChange(project, 'publicidade', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Manut. Stand (R$)</label>
                    <input
                      type="number"
                      value={localBudgets[project]?.stand || ''}
                      onChange={(e) => handleChange(project, 'stand', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Institucional (R$)</label>
                    <input
                      type="number"
                      value={localBudgets[project]?.institucional || ''}
                      onChange={(e) => handleChange(project, 'institucional', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Produtos (R$)</label>
                    <input
                      type="number"
                      value={localBudgets[project]?.produtos || ''}
                      onChange={(e) => handleChange(project, 'produtos', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">VGV do Produto (R$)</label>
                    <input
                      type="number"
                      value={localBudgets[project]?.vgv || ''}
                      onChange={(e) => handleChange(project, 'vgv', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">% MKT (Meta)</label>
                    <input
                      type="number"
                      value={localBudgets[project]?.percentMkt || ''}
                      onChange={(e) => handleChange(project, 'percentMkt', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">% Manut. Stand (Meta)</label>
                    <input
                      type="number"
                      value={localBudgets[project]?.percentManutStand || ''}
                      onChange={(e) => handleChange(project, 'percentManutStand', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">% Produto (Meta)</label>
                    <input
                      type="number"
                      value={localBudgets[project]?.percentProduto || ''}
                      onChange={(e) => handleChange(project, 'percentProduto', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Estoque de Unid.</label>
                    <input
                      type="number"
                      value={localBudgets[project]?.estoqueUnid || ''}
                      onChange={(e) => handleChange(project, 'estoqueUnid', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Meta de Vendas</label>
                    <input
                      type="number"
                      value={localBudgets[project]?.metaVendas || ''}
                      onChange={(e) => handleChange(project, 'metaVendas', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end space-x-3 flex-shrink-0 bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl font-medium bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-colors"
          >
            <Save size={20} />
            <span>Salvar Previsões</span>
          </button>
        </div>
      </div>
    </div>
  );
};
