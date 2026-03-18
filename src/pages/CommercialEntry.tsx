import React, { useRef, useState } from 'react';
import { PlusCircle, Trash2, Upload, Database, Loader2 } from 'lucide-react';
import * as xlsx from 'xlsx';
import { useExpense } from '../context/ExpenseContext';
import { MONTHS, formatCurrency, matchProject, getCityForProject } from '../utils';
import { Project, SaleRecord, PipelineRecord, City, PROJECTS_BY_CITY, CommercialRecord } from '../types';
import { supabase } from '../lib/supabase';

export default function CommercialEntry() {
  const { data, currentMonthData, selectedProject, updateCommercialData, addCommercialMetrics, setIsCommercialModalOpen, filteredCommercialRecords, deleteCommercialRecord, addCommercialRecords, addMonth, syncSupabaseData, selectedMonthId } = useExpense();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const parseSheetName = (sheetName: string): { month: number, year: number } | null => {
    // Try to find a 4-digit year
    const yearMatch = sheetName.match(/\b(20\d{2})\b/);
    if (!yearMatch) return null;
    const year = parseInt(yearMatch[1]);

    // Try to find month by number (01-12)
    const monthNumMatch = sheetName.match(/\b(0?[1-9]|1[0-2])\b/);
    if (monthNumMatch && monthNumMatch[1] !== yearMatch[1]) {
      return { month: parseInt(monthNumMatch[1]), year };
    }

    // Try to find month by name (Portuguese)
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const lowerName = sheetName.toLowerCase();
    for (let i = 0; i < months.length; i++) {
      if (lowerName.includes(months[i])) {
        return { month: i + 1, year };
      }
    }

    return null;
  };

  const parseMonthFromName = (name: string): number | null => {
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const lowerName = name.toLowerCase().trim();
    for (let i = 0; i < months.length; i++) {
      if (lowerName === months[i] || lowerName.startsWith(months[i].substring(0, 3))) {
        return i + 1;
      }
    }
    return null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileDate = new Date(file.lastModified);
    const now = new Date();
    const safeDate = fileDate > now ? now : fileDate;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = xlsx.read(buffer, { type: 'array' });
      
      let totalImported = 0;

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csvText = xlsx.utils.sheet_to_csv(sheet, { FS: ';' });
        
        let year = safeDate.getFullYear();
        let month = safeDate.getMonth() + 1;
        
        const parsedDate = parseSheetName(sheetName);
        if (parsedDate) {
          year = parsedDate.year;
          month = parsedDate.month;
        }
        
        const importedCount = parseCSV(csvText, year, month);
        totalImported += importedCount;
      }

      if (totalImported > 0) {
        alert(`${totalImported} lançamentos importados com sucesso de todas as abas!`);
      } else {
        alert('Nenhum lançamento válido encontrado no arquivo.');
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Erro ao ler o arquivo. Certifique-se de que é um arquivo Excel ou CSV válido.');
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const parseCSV = (text: string, defaultYear: number, defaultMonth: number): number => {
    const lines = text.split('\n').map(l => l.trim());
    let currentSection = '';
    let currentProject: Project | null = null;
    
    let year = defaultYear;
    let month = defaultMonth;

    const newRecords: Omit<CommercialRecord, 'id'>[] = [];
    const projectMetrics: Partial<Record<Project, { vendas: number, vgv: number, leads: number, visitasOn: number, visitasOff: number }>> = {};
    
    // Check the first few lines for the month name (e.g., "Relatório comercial: Fevereiro")
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const cols = lines[i].split(';').map(c => c.trim());
      if (cols[0]?.toLowerCase().includes('relatório comercial:') || cols[0]?.toLowerCase() === 'relatório comercial:') {
        const monthStr = cols[1] || cols[0].split(':')[1]?.trim();
        if (monthStr) {
          const parsedMonth = parseMonthFromName(monthStr);
          if (parsedMonth) month = parsedMonth;
        }
      }
    }

    const dateStr = `${year}-${month.toString().padStart(2, '0')}-01`;
    const targetMonthId = `${year}-${month.toString().padStart(2, '0')}`;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cols = line.split(';').map(c => c.trim());
      
      if (cols.length < 2) continue;

      if (cols[0] === 'Vendas' && cols[1] === 'Qtde') {
        currentSection = 'Vendas';
        continue;
      }
      if (cols[0] === 'Pipeline' && cols[1] === 'Qtde Tratativas') {
        currentSection = 'Pipeline';
        continue;
      }
      if (cols[0] === 'Visitas PDV' || cols[0].includes('Visitas PDV')) {
        currentSection = 'Visitas';
        continue;
      }
      if (cols[0] === 'Leads' || cols[0].includes('Leads')) {
        currentSection = 'Leads';
        continue;
      }

      const parseNumber = (val: string) => {
        if (!val || val === '-') return 0;
        const num = parseInt(val.replace(/\D/g, ''));
        return isNaN(num) ? 0 : num;
      };

      if (currentSection === 'Visitas') {
        let projCol = cols[0];
        if (projCol && !projCol.toLowerCase().startsWith('total') && projCol !== '-' && projCol !== '') {
          const matched = matchProject(projCol);
          if (matched) {
            if (!projectMetrics[matched]) projectMetrics[matched] = { vendas: 0, vgv: 0, leads: 0, visitasOn: 0, visitasOff: 0 };
            
            // Assuming cols[1] is Indicação IVS, cols[2] is Espontânea, cols[3] is Parceria, cols[4] is On-line
            const visitasOff = parseNumber(cols[1]) + parseNumber(cols[2]) + parseNumber(cols[3]);
            const visitasOn = parseNumber(cols[4]);
            
            projectMetrics[matched]!.visitasOff += visitasOff;
            projectMetrics[matched]!.visitasOn += visitasOn;
          }
        }
      }

      if (currentSection === 'Leads') {
        let projCol = cols[0];
        if (projCol && !projCol.toLowerCase().startsWith('total') && projCol !== '-' && projCol !== '') {
          const matched = matchProject(projCol);
          if (matched) {
            if (!projectMetrics[matched]) projectMetrics[matched] = { vendas: 0, vgv: 0, leads: 0, visitasOn: 0, visitasOff: 0 };
            
            // Assuming cols[1] is Descartado, cols[2] is Em Atendimento, cols[3] is Visita Realizada, cols[4] is Atendimento SDR
            const leads = parseNumber(cols[1]) + parseNumber(cols[2]) + parseNumber(cols[3]) + parseNumber(cols[4]);
            projectMetrics[matched]!.leads += leads;
          }
        }
      }

      if (currentSection === 'Vendas' || currentSection === 'Pipeline') {
        let projCol = cols[0];
        
        if (projCol && !projCol.toLowerCase().startsWith('total') && projCol !== '-' && projCol !== '') {
          const matched = matchProject(projCol);
          if (matched) currentProject = matched;
        }
        
        if (cols[0].toLowerCase().startsWith('total') || (cols[1] && cols[1].toLowerCase().startsWith('total'))) {
          continue;
        }

        const qtde = parseInt(cols[1]);
        if (!isNaN(qtde) && qtde > 0 && currentProject) {
          const city = getCityForProject(currentProject);
          
          const parseCurrency = (val: string) => {
            if (!val || val === '-') return 0;
            let cleaned = val.replace(/R\$/g, '').trim();
            if (cleaned.includes(',')) {
              cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
            }
            const num = parseFloat(cleaned);
            return isNaN(num) ? 0 : num;
          };

          if (currentSection === 'Vendas') {
            const vgvNominal = parseCurrency(cols[3]);
            newRecords.push({
              date: dateStr,
              city,
              project: currentProject,
              type: 'venda',
              vendas: '1',
              qtde: qtde,
              unidade: cols[2],
              vgvNominal,
              vgvVp: parseCurrency(cols[4]),
              ev: parseCurrency(cols[5]),
              origem: cols[6],
              status1: cols[7],
              status2: cols[8] || ''
            } as SaleRecord);

            if (!projectMetrics[currentProject]) {
              projectMetrics[currentProject] = { vendas: 0, vgv: 0, leads: 0, visitasOn: 0, visitasOff: 0 };
            }
            projectMetrics[currentProject]!.vendas += qtde;
            projectMetrics[currentProject]!.vgv += vgvNominal;
          } else {
            newRecords.push({
              date: dateStr,
              city,
              project: currentProject,
              type: 'pipeline',
              pipeline: '1',
              qtdeTratativas: qtde,
              unidade: cols[2],
              propostaNegociada: cols[3] || '',
              propostaVgvNominal: parseCurrency(cols[4]),
              imobiliaria: cols[5] || '',
              origem: cols[6] || '',
              status: cols[7] || '',
              descritivo: cols[8] || ''
            } as PipelineRecord);
          }
        }
      }
    }

    if (newRecords.length > 0 || Object.keys(projectMetrics).length > 0) {
      addMonth(year, month);
      if (newRecords.length > 0) {
        addCommercialRecords(newRecords);
      }
      
      Object.entries(projectMetrics).forEach(([proj, metrics]) => {
        addCommercialMetrics(proj as Project, metrics, targetMonthId);
      });
    }
    
    return newRecords.length + Object.keys(projectMetrics).length;
  };

  const handleSupabaseSync = async () => {
    if (!supabase) {
      alert('Supabase não está configurado. Verifique as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env');
      return;
    }

    setIsSyncing(true);
    try {
      await syncSupabaseData();
      alert('Sincronização com Supabase concluída com sucesso!');
    } catch (error) {
      console.error('Erro ao sincronizar com Supabase:', error);
      alert('Erro ao sincronizar com Supabase. Verifique o console para mais detalhes.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!currentMonthData) return <div>Carregando...</div>;

  const handleCommercialChange = (field: 'leads' | 'vendas' | 'vgv' | 'visitasOn' | 'visitasOff', value: string) => {
    if (selectedProject === 'ALL') return;
    const num = parseFloat(value);
    updateCommercialData(selectedProject as Project, { [field]: isNaN(num) ? 0 : num });
  };

  const currentCommercial = selectedProject !== 'ALL' 
    ? (currentMonthData.commercial[selectedProject] || { leads: 0, vendas: 0, vgv: 0, visitasOn: 0, visitasOff: 0 })
    : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Comercial</h2>
          <p className="text-slate-500 mt-1">
            Insira os dados comerciais para {MONTHS[currentMonthData.month - 1]} de {currentMonthData.year}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSupabaseSync}
            disabled={isSyncing}
            className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl shadow-sm transition-colors font-medium disabled:opacity-50"
          >
            {isSyncing ? <Loader2 size={20} className="animate-spin" /> : <Database size={20} />}
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Supabase'}</span>
          </button>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl shadow-sm transition-colors font-medium"
          >
            <Upload size={20} />
            <span>Importar Planilha</span>
          </button>
          <button
            onClick={() => setIsCommercialModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-sm transition-colors font-medium"
          >
            <PlusCircle size={20} />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </header>

      {selectedProject === 'ALL' ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl shadow-sm">
          <p className="font-medium">Selecione um empreendimento específico no menu lateral para inserir dados comerciais.</p>
        </div>
      ) : selectedMonthId.endsWith('-ALL') ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl shadow-sm">
          <p className="font-medium">Selecione um mês específico para editar as métricas comerciais.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 border-t-4 border-t-rose-500">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Métricas Comerciais - {selectedProject}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Leads</label>
              <input
                type="number"
                value={currentCommercial?.leads || ''}
                onChange={(e) => handleCommercialChange('leads', e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                placeholder="Ex: 1500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Vendas</label>
              <input
                type="number"
                value={currentCommercial?.vendas || ''}
                onChange={(e) => handleCommercialChange('vendas', e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                placeholder="Ex: 12"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">VGV (R$)</label>
              <input
                type="number"
                value={currentCommercial?.vgv || ''}
                onChange={(e) => handleCommercialChange('vgv', e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                placeholder="Ex: 5000000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Visitas On</label>
              <input
                type="number"
                value={currentCommercial?.visitasOn || ''}
                onChange={(e) => handleCommercialChange('visitasOn', e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                placeholder="Ex: 300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Visitas Off</label>
              <input
                type="number"
                value={currentCommercial?.visitasOff || ''}
                onChange={(e) => handleCommercialChange('visitasOff', e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                placeholder="Ex: 150"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Lançamentos Comerciais */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Lançamentos Comerciais</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white">
              <tr className="text-slate-500 uppercase tracking-wider text-xs border-b border-slate-200">
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium">Empreendimento</th>
                <th className="px-6 py-4 font-medium">Tipo</th>
                <th className="px-6 py-4 font-medium">Detalhes</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCommercialRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Nenhum lançamento comercial encontrado para este período.
                  </td>
                </tr>
              ) : (
                filteredCommercialRecords.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                      {new Date(record.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-slate-900">{record.project}</span>
                      <span className="block text-xs text-slate-500">{record.city}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        record.type === 'venda' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {record.type === 'venda' ? 'Venda' : 'Pipeline'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {record.type === 'venda' ? (
                        <div className="text-xs space-y-1">
                          <p><strong>Vendas:</strong> {(record as SaleRecord).vendas} | <strong>Qtde:</strong> {(record as SaleRecord).qtde} | <strong>Unidade:</strong> {(record as SaleRecord).unidade}</p>
                          <p><strong>VGV Nom:</strong> {formatCurrency((record as SaleRecord).vgvNominal)} | <strong>VGV VP:</strong> {formatCurrency((record as SaleRecord).vgvVp)}</p>
                          <p><strong>EV:</strong> {formatCurrency((record as SaleRecord).ev)} | <strong>Origem:</strong> {(record as SaleRecord).origem}</p>
                          <p><strong>Status 1:</strong> {(record as SaleRecord).status1} | <strong>Status 2:</strong> {(record as SaleRecord).status2}</p>
                        </div>
                      ) : (
                        <div className="text-xs space-y-1">
                          <p><strong>Pipeline:</strong> {(record as PipelineRecord).pipeline} | <strong>Qtde:</strong> {(record as PipelineRecord).qtdeTratativas} | <strong>Unidade:</strong> {(record as PipelineRecord).unidade}</p>
                          <p><strong>Prop. Negociada:</strong> {(record as PipelineRecord).propostaNegociada} | <strong>Prop. VGV:</strong> {formatCurrency((record as PipelineRecord).propostaVgvNominal)}</p>
                          <p><strong>Imobiliária:</strong> {(record as PipelineRecord).imobiliaria} | <strong>Origem:</strong> {(record as PipelineRecord).origem}</p>
                          <p><strong>Status:</strong> {(record as PipelineRecord).status} | <strong>Desc:</strong> {(record as PipelineRecord).descritivo}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => deleteCommercialRecord(record.id)}
                        className="text-rose-500 hover:text-rose-700 p-2 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
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
};
