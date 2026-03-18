import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { Project, City, PROJECTS_BY_CITY, CommercialRecordType, SaleRecord, PipelineRecord } from '../types';

export const CommercialModal = () => {
  const { isCommercialModalOpen, setIsCommercialModalOpen, addCommercialRecord, selectedCity, selectedProject, userRole, addMonth, data, updateCommercialData } = useExpense();

  const [type, setType] = useState<CommercialRecordType>('venda');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [city, setCity] = useState<City>(selectedCity === 'ALL' ? 'Rio de Janeiro' : selectedCity);
  const [project, setProject] = useState<Project>(selectedProject === 'ALL' ? PROJECTS_BY_CITY[city][0] : selectedProject);

  // Venda fields
  const [vendas, setVendas] = useState('');
  const [qtde, setQtde] = useState('');
  const [unidade, setUnidade] = useState('');
  const [vgvNominal, setVgvNominal] = useState('');
  const [vgvVp, setVgvVp] = useState('');
  const [ev, setEv] = useState('');
  const [origem, setOrigem] = useState('');
  const [status1, setStatus1] = useState('');
  const [status2, setStatus2] = useState('');

  // Pipeline fields
  const [pipeline, setPipeline] = useState('');
  const [qtdeTratativas, setQtdeTratativas] = useState('');
  const [propostaNegociada, setPropostaNegociada] = useState('');
  const [propostaVgvNominal, setPropostaVgvNominal] = useState('');
  const [imobiliaria, setImobiliaria] = useState('');
  const [descritivo, setDescritivo] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (isCommercialModalOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      if (selectedCity !== 'ALL') setCity(selectedCity);
      if (selectedProject !== 'ALL') setProject(selectedProject);
    }
  }, [isCommercialModalOpen, selectedCity, selectedProject]);

  useEffect(() => {
    if (selectedProject === 'ALL' && !PROJECTS_BY_CITY[city].includes(project)) {
      setProject(PROJECTS_BY_CITY[city][0]);
    }
  }, [city, project, selectedProject]);

  if (!isCommercialModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const [year, month] = date.split('-');
    const targetMonthId = `${year}-${month}`;
    addMonth(parseInt(year), parseInt(month));

    if (type === 'venda') {
      const record: Omit<SaleRecord, 'id'> = {
        date,
        city,
        project,
        type: 'venda',
        vendas,
        qtde: Number(qtde) || 0,
        unidade,
        vgvNominal: Number(vgvNominal) || 0,
        vgvVp: Number(vgvVp) || 0,
        ev: Number(ev) || 0,
        origem,
        status1,
        status2
      };
      addCommercialRecord(record);
      
      const targetMonthData = data.find(m => m.id === targetMonthId) || { commercial: {} as any };
      const currentCommercial = targetMonthData.commercial[project] || { leads: 0, vendas: 0, vgv: 0 };
      
      updateCommercialData(project, {
        vendas: currentCommercial.vendas + (Number(qtde) || 0),
        vgv: currentCommercial.vgv + (Number(vgvNominal) || 0)
      }, targetMonthId);
      
    } else {
      const record: Omit<PipelineRecord, 'id'> = {
        date,
        city,
        project,
        type: 'pipeline',
        pipeline,
        qtdeTratativas: Number(qtdeTratativas) || 0,
        unidade,
        propostaNegociada,
        propostaVgvNominal: Number(propostaVgvNominal) || 0,
        imobiliaria,
        origem,
        status,
        descritivo
      };
      addCommercialRecord(record);
    }

    // Reset forms
    setVendas('');
    setQtde('');
    setUnidade('');
    setVgvNominal('');
    setVgvVp('');
    setEv('');
    setOrigem('');
    setStatus1('');
    setStatus2('');
    setPipeline('');
    setQtdeTratativas('');
    setPropostaNegociada('');
    setPropostaVgvNominal('');
    setImobiliaria('');
    setDescritivo('');
    setStatus('');
    
    setIsCommercialModalOpen(false);
  };

  const availableCities: City[] = (userRole === 'MASTER' || userRole === 'ADMINISTRATIVO') ? ['Rio de Janeiro', 'Campinas'] : [(userRole === 'FUNCIONARIO_RJ' || userRole === 'COMERCIAL_RJ') ? 'Rio de Janeiro' : 'Campinas'];

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Novo Lançamento Comercial</h2>
          <button onClick={() => setIsCommercialModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[80vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Data</label>
              <input
                type="date"
                required
                value={date}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Registro</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CommercialRecordType)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
              >
                <option value="venda">Venda</option>
                <option value="pipeline">Pipeline</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Cidade</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value as City)}
                disabled={selectedCity !== 'ALL'}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white disabled:bg-slate-100 disabled:text-slate-500"
              >
                {availableCities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Empreendimento</label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value as Project)}
                disabled={selectedProject !== 'ALL'}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white disabled:bg-slate-100 disabled:text-slate-500"
              >
                {PROJECTS_BY_CITY[city].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            {type === 'venda' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Vendas</label>
                  <input type="text" value={vendas} onChange={e => setVendas(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Qtde</label>
                  <input type="number" value={qtde} onChange={e => setQtde(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Unidade</label>
                  <input type="text" value={unidade} onChange={e => setUnidade(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Vendas VGV (nominal)</label>
                  <input type="number" step="0.01" value={vgvNominal} onChange={e => setVgvNominal(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Vendas VGV (VP)</label>
                  <input type="number" step="0.01" value={vgvVp} onChange={e => setVgvVp(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">EV</label>
                  <input type="number" step="0.01" value={ev} onChange={e => setEv(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Origem</label>
                  <input type="text" value={origem} onChange={e => setOrigem(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status 1</label>
                  <input type="text" value={status1} onChange={e => setStatus1(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status 2</label>
                  <input type="text" value={status2} onChange={e => setStatus2(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Pipeline</label>
                  <input type="text" value={pipeline} onChange={e => setPipeline(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Qtde Tratativas</label>
                  <input type="number" value={qtdeTratativas} onChange={e => setQtdeTratativas(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Unidade</label>
                  <input type="text" value={unidade} onChange={e => setUnidade(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Proposta Negociada</label>
                  <input type="text" value={propostaNegociada} onChange={e => setPropostaNegociada(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Proposta VGV (nominal)</label>
                  <input type="number" step="0.01" value={propostaVgvNominal} onChange={e => setPropostaVgvNominal(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Imobiliária</label>
                  <input type="text" value={imobiliaria} onChange={e => setImobiliaria(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Origem</label>
                  <input type="text" value={origem} onChange={e => setOrigem(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <input type="text" value={status} onChange={e => setStatus(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Descritivo</label>
                  <textarea value={descritivo} onChange={e => setDescritivo(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none" />
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsCommercialModalOpen(false)}
              className="px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl font-medium bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-colors"
            >
              Salvar Lançamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
