import React, { useState, useRef } from 'react';
import { useExpense } from '../context/ExpenseContext';
import { useAuth } from '../context/AuthContext';
import { INSTITUCIONAL_CATEGORIES, ExpenseCategory, ALL_PROJECTS, PROJECTS_BY_CITY, Project, City, Transaction } from '../types';
import { formatCurrency, MONTHS } from '../utils';
import { PlusCircle, Edit2, Check, X, Upload, Settings } from 'lucide-react';
import * as xlsx from 'xlsx';
import { BudgetModal } from '../components/BudgetModal';

export default function InstitucionalEntry() {
  const { selectedMonthId, currentMonthData, filteredTransactions, setIsModalOpen, updateTransactionAmount, selectedProject, addTransactions } = useExpense();
  const { userRole } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentMonthData) return <div>Carregando...</div>;

  const handleAddTransaction = () => {
    setIsModalOpen(true);
  };

  const handleEditStart = (id: string, currentAmount: number) => {
    setEditingId(id);
    setEditAmount(currentAmount.toString());
  };

  const handleEditSave = (id: string) => {
    const num = parseFloat(editAmount);
    if (!isNaN(num) && num > 0) {
      updateTransactionAmount(id, num);
    }
    setEditingId(null);
  };

  const handleEditCancel = () => {
    setEditingId(null);
  };

  const currentMonthTransactions = filteredTransactions.filter(t => t.date.startsWith(selectedMonthId) && t.type === 'Institucional').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const normalizeString = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const matchProject = (sheetName: string): Project | null => {
    const normalized = normalizeString(sheetName);
    for (const p of ALL_PROJECTS) {
      const pNorm = normalizeString(p);
      if (normalized === pNorm || normalized.includes(pNorm) || pNorm.includes(normalized)) {
        return p;
      }
    }
    return null;
  };

  const getCityForProject = (project: Project): City => {
    return PROJECTS_BY_CITY['Rio de Janeiro'].includes(project as any) ? 'Rio de Janeiro' : 'Campinas';
  };

  const parseHeaderDate = (header: string | number): { year: number, month: number } | null => {
    if (!header) return null;
    const str = String(header).trim().toLowerCase();
    
    const mmYyyyMatch = str.match(/^(\d{1,2})[\/\-](\d{2,4})$/);
    if (mmYyyyMatch) {
      const month = parseInt(mmYyyyMatch[1], 10);
      let year = parseInt(mmYyyyMatch[2], 10);
      if (year < 100) year += 2000;
      if (month >= 1 && month <= 12) return { year, month };
    }

    const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    for (let i = 0; i < monthNames.length; i++) {
      if (str.startsWith(monthNames[i])) {
        const yearMatch = str.match(/\d{2,4}$/);
        if (yearMatch) {
          let year = parseInt(yearMatch[0], 10);
          if (year < 100) year += 2000;
          return { year, month: i + 1 };
        }
      }
    }
    
    const num = Number(header);
    if (!isNaN(num) && num > 40000 && num < 50000) {
      const date = new Date(Math.round((num - 25569) * 86400 * 1000));
      return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
    }

    return null;
  };

  const matchCategory = (str: string): { category: ExpenseCategory, type: 'Institucional' } | null => {
    if (!str) return null;
    const normalized = normalizeString(str);
    
    for (const cat of INSTITUCIONAL_CATEGORIES) {
      if (normalized === normalizeString(cat) || normalized.includes(normalizeString(cat)) || normalizeString(cat).includes(normalized)) {
        return { category: cat, type: 'Institucional' };
      }
    }
    return null;
  };

  const parseCurrency = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val || typeof val !== 'string') return 0;
    
    let cleanStr = val.replace(/R\$\s?/g, '').trim();
    
    if (cleanStr.includes(',') && cleanStr.includes('.')) {
      const lastComma = cleanStr.lastIndexOf(',');
      const lastDot = cleanStr.lastIndexOf('.');
      if (lastComma > lastDot) {
        cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
      } else {
        cleanStr = cleanStr.replace(/,/g, '');
      }
    } else if (cleanStr.includes(',')) {
      cleanStr = cleanStr.replace(',', '.');
    }
    
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = xlsx.read(buffer, { type: 'array' });
      
      const newTransactions: Omit<Transaction, 'id'>[] = [];

      for (const sheetName of workbook.SheetNames) {
        const project = matchProject(sheetName);
        if (!project) continue;

        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        let dateColumns: { colIndex: number, year: number, month: number }[] = [];
        let headerRowIndex = -1;

        for (let i = 0; i < Math.min(rows.length, 20); i++) {
          const row = rows[i];
          if (!row) continue;
          
          const tempDateCols = [];
          for (let j = 0; j < row.length; j++) {
            const parsed = parseHeaderDate(row[j]);
            if (parsed) {
              tempDateCols.push({ colIndex: j, ...parsed });
            }
          }
          
          if (tempDateCols.length > 0) {
            headerRowIndex = i;
            dateColumns = tempDateCols;
            break;
          }
        }

        if (headerRowIndex === -1 || dateColumns.length === 0) continue;

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          let categoryMatch = null;
          let description = '';
          for (let j = 0; j < Math.min(row.length, 5); j++) {
            const cellValue = String(row[j] || '');
            const match = matchCategory(cellValue);
            if (match) {
              categoryMatch = match;
              description = cellValue.length > match.category.length + 3 ? cellValue : String(row[j+1] || match.category);
              break;
            }
          }

          if (!categoryMatch) continue;

          for (const dateCol of dateColumns) {
            const amount = parseCurrency(row[dateCol.colIndex]);
            if (amount > 0) {
              newTransactions.push({
                date: `${dateCol.year}-${dateCol.month.toString().padStart(2, '0')}-01`,
                city: getCityForProject(project),
                project,
                type: categoryMatch.type,
                category: categoryMatch.category,
                amount,
                description: description.substring(0, 100)
              });
            }
          }
        }
      }

      if (newTransactions.length > 0) {
        addTransactions(newTransactions);
        alert(`${newTransactions.length} lançamentos importados com sucesso de todas as abas!`);
      } else {
        alert('Nenhum lançamento válido encontrado no arquivo.');
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Erro ao ler o arquivo. Certifique-se de que é um arquivo Excel válido.');
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Institucional</h2>
          <p className="text-slate-500 mt-1">
            Insira os gastos institucionais para {MONTHS[currentMonthData.month - 1]} de {currentMonthData.year}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(userRole === 'MASTER' || userRole === 'ADMINISTRATIVO') && !selectedMonthId.endsWith('-ALL') && (
            <button
              onClick={() => setIsBudgetModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-sm transition-colors font-medium w-fit"
            >
              <Settings size={20} />
              <span className="hidden sm:inline">Definir Previsões</span>
            </button>
          )}
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            ref={fileInputRef}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-600 text-slate-700 rounded-xl shadow-sm transition-colors font-medium w-fit"
          >
            <Upload size={20} />
            <span>Importar Planilha</span>
          </button>
          <button
            onClick={handleAddTransaction}
            className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-sm transition-colors font-medium w-fit"
          >
            <PlusCircle size={20} />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </header>

      {selectedProject === 'ALL' ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl shadow-sm">
          <p className="font-medium">Selecione um empreendimento específico no menu lateral para visualizar as previsões de orçamento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 border-t-4 border-t-amber-500">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Orçamento Institucional - {selectedProject}</h3>
            <div className="max-w-xs">
              <p className="text-3xl font-bold text-slate-900">
                {formatCurrency(currentMonthData.budgets[selectedProject]?.institucional || 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      <BudgetModal isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} />

      <div className="grid grid-cols-1 gap-8">
        {/* Institucional */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
          <div className="bg-amber-500 px-6 py-4">
            <h3 className="text-lg font-bold text-white tracking-wide">BASAL INSTITUCIONAL</h3>
          </div>
          <div className="p-6 space-y-4">
            {INSTITUCIONAL_CATEGORIES.map(cat => {
              const val = filteredTransactions.filter(t => t.date.startsWith(selectedMonthId) && t.category === cat).reduce((sum, t) => sum + t.amount, 0);
              if (val === 0) return null;
              return (
                <div key={cat} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0">
                  <span className="text-sm font-medium text-slate-700">{cat}</span>
                  <span className="font-bold text-slate-900">{formatCurrency(val)}</span>
                </div>
              );
            })}
            {INSTITUCIONAL_CATEGORIES.every(cat => filteredTransactions.filter(t => t.date.startsWith(selectedMonthId) && t.category === cat).reduce((sum, t) => sum + t.amount, 0) === 0) && (
              <p className="text-sm text-slate-500 italic">Nenhum lançamento neste mês.</p>
            )}
          </div>
        </div>
      </div>

      {/* Histórico de Lançamentos */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-800">Histórico de Lançamentos Institucionais do Mês</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-medium">Data</th>
                <th className="px-6 py-3 font-medium">Local</th>
                <th className="px-6 py-3 font-medium">Tipo</th>
                <th className="px-6 py-3 font-medium">Categoria</th>
                <th className="px-6 py-3 font-medium">Descrição</th>
                <th className="px-6 py-3 font-medium text-right">Valor</th>
                <th className="px-6 py-3 font-medium text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {currentMonthTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Nenhum lançamento encontrado para este mês.
                  </td>
                </tr>
              ) : (
                currentMonthTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                      {new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{t.project}</div>
                      <div className="text-xs text-slate-500">{t.city}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">
                      {t.category}
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                      {t.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-slate-900">
                      {editingId === t.id ? (
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-24 text-right px-2 py-1 border border-emerald-500 rounded outline-none"
                          autoFocus
                        />
                      ) : (
                        formatCurrency(t.amount)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {editingId === t.id ? (
                        <div className="flex items-center justify-center space-x-2">
                          <button onClick={() => handleEditSave(t.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                            <Check size={16} />
                          </button>
                          <button onClick={handleEditCancel} className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => handleEditStart(t.id, t.amount)} className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors">
                          <Edit2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
